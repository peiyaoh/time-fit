import { randomUUID } from "node:crypto";
import { isValidTimeZone } from "../timeZone.js";
import { validateTaskSet } from "../taskSpec.js";
import { processDecision } from "./decision.js";
import { bindLogger, describeError } from "./logging.js";
import { mapWithConcurrency } from "./pool.js";
import { findDueOccurrences } from "./schedule.js";
import { tallyOutcomes } from "./summary.js";

const MILLISECONDS_PER_MINUTE = 60_000;
const MAX_PARTICIPANT_ID_LENGTH = 256;

/** Raised inside a tick when a port failure means the tick cannot be trusted to be complete. */
class TickAbort extends Error {
  /**
   * @param {string} stage
   * @param {unknown} cause
   * @param {ReadonlyArray<string>} [completedOutcomes]  outcomes of work finished before the abort
   */
  constructor(stage, cause, completedOutcomes = []) {
    super(`tick aborted at ${stage}`);
    this.stage = stage;
    this.cause = cause;
    this.completedOutcomes = Object.freeze([...completedOutcomes]);
  }

  withEarlierOutcomes(earlierOutcomes) {
    return new TickAbort(this.stage, this.cause, [...earlierOutcomes, ...this.completedOutcomes]);
  }
}

/**
 * One scheduling pass (ADR 0005 §3-4). Never throws for port or plugin failures; those are
 * logged and reflected in the summary.
 * @param {object} engine          resolved engine config
 * @param {Date | null} lastTick   end of the previous successful window, in memory only
 * @param {Date} now
 * @returns {Promise<{ summary: Readonly<object>, advanceLastTick: boolean }>}
 */
export async function runTick(engine, lastTick, now) {
  const startedAt = performance.now();
  const tick = Object.freeze({ tickId: randomUUID(), now });
  const logger = bindLogger(engine.logger, { tickId: tick.tickId });
  if (lastTick !== null && now.getTime() <= lastTick.getTime()) {
    logger.warn("tick-clock-not-advanced", { now: now.toISOString(), lastTick: lastTick.toISOString() });
    return { summary: summarize(tick, null, [], { completed: false, startedAt }), advanceLastTick: false };
  }
  const window = tickWindow(engine, lastTick, now);
  await reportMissedWindow(engine, logger, lastTick, window, tick);
  try {
    const outcomes = await evaluateWindow(engine, tick, window, logger);
    const summary = summarize(tick, window, outcomes, { completed: true, startedAt });
    logger.info("tick-completed", summary);
    return { summary, advanceLastTick: true };
  } catch (error) {
    if (!(error instanceof TickAbort)) throw error;
    logger.error("tick-failed", { stage: error.stage, error: describeError(error.cause) });
    const summary = summarize(tick, window, error.completedOutcomes, { completed: false, startedAt, failedStage: error.stage });
    return { summary, advanceLastTick: false };
  }
}

function tickWindow(engine, lastTick, now) {
  const catchUpStart = now.getTime() - engine.options.catchUpWindowMinutes * MILLISECONDS_PER_MINUTE;
  const from = lastTick === null ? catchUpStart : Math.max(lastTick.getTime(), catchUpStart);
  return Object.freeze({ from: new Date(from), to: new Date(now) });
}

async function reportMissedWindow(engine, logger, lastTick, window, tick) {
  if (lastTick === null || lastTick.getTime() >= window.from.getTime()) return;
  const gap = Object.freeze({ from: new Date(lastTick), to: new Date(window.from), tickId: tick.tickId });
  logger.warn("scheduler-missed-window", { from: gap.from.toISOString(), to: gap.to.toISOString() });
  if (typeof engine.decisionLog.recordGap !== "function") return;
  try {
    await engine.decisionLog.recordGap(gap);
  } catch (error) {
    logger.error("decision-log-record-gap-failed", { error: describeError(error) });
  }
}

async function evaluateWindow(engine, tick, window, logger) {
  const { tasks, outcomes: taskOutcomes } = await loadTasks(engine, tick, logger);
  const systemTasks = tasks.filter(({ spec }) => spec.scope === "system");
  const participantTasks = tasks.filter(({ spec }) => spec.scope === "participant");
  const systemOutcomes = [];
  for (const task of systemTasks) {
    systemOutcomes.push(...(await evaluateSubject(engine, tick, window, logger, task, null, task.spec.timeZone)));
  }
  const earlierOutcomes = [...taskOutcomes, ...systemOutcomes];
  try {
    const participantOutcomes = participantTasks.length === 0 ? [] : await evaluateParticipants(engine, tick, window, logger, participantTasks);
    return [...earlierOutcomes, ...participantOutcomes];
  } catch (error) {
    throw error instanceof TickAbort ? error.withEarlierOutcomes(earlierOutcomes) : error;
  }
}

async function loadTasks(engine, tick, logger) {
  if (engine.staticTasks !== null) return { tasks: sortByPriority(engine.staticTasks), outcomes: [] };
  const specs = await listActiveTasks(engine, tick);
  const bounded = capTaskList(specs, engine.options.maxTasks, logger);
  const context = { conditionTypes: engine.conditionTypes, actionTypes: engine.actionTypes, hasPreferenceResolver: engine.preferenceResolver !== null };
  const { tasks, rejected } = validateTaskSet(bounded, context, { maxTasks: engine.options.maxTasks });
  rejected.forEach(({ taskId, error }) => logger.warn("task-invalid", { taskId, error }));
  const runnable = tasks.filter(({ spec }) => spec.scope === "system" || engine.participantsPort !== null);
  tasks
    .filter((task) => !runnable.includes(task))
    .forEach(({ spec }) => logger.warn("task-invalid", { taskId: spec.id, error: { code: "missing-participants-port" } }));
  const rejectedCount = rejected.length + (tasks.length - runnable.length);
  return { tasks: sortByPriority(runnable), outcomes: Array(rejectedCount).fill("taskRejected") };
}

async function listActiveTasks(engine, tick) {
  let specs;
  try {
    specs = await engine.tasksPort.listActive(new Date(tick.now));
  } catch (error) {
    throw new TickAbort("tasks", error);
  }
  if (!Array.isArray(specs)) throw new TickAbort("tasks", new TypeError("tasks.listActive must resolve to an array"));
  return specs;
}

function capTaskList(specs, maxTasks, logger) {
  if (specs.length <= maxTasks) return specs;
  logger.warn("tasks-cap-reached", { received: specs.length, maxTasks });
  return specs.slice(0, maxTasks);
}

function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => a.spec.priority - b.spec.priority || (a.spec.id < b.spec.id ? -1 : 1));
}

async function evaluateParticipants(engine, tick, window, logger, tasks) {
  const outcomes = [];
  const evaluateOne = (raw) => evaluateParticipant(engine, tick, window, logger, tasks, raw);
  try {
    for await (const page of participantPages(engine, logger)) {
      (await mapWithConcurrency(page, engine.options.concurrency, evaluateOne)).forEach((list) => outcomes.push(...list));
    }
  } catch (error) {
    throw error instanceof TickAbort ? error.withEarlierOutcomes(outcomes) : error;
  }
  return outcomes;
}

async function* participantPages(engine, logger) {
  const { pageSize, maxParticipants } = engine.options;
  let cursor = null;
  let seen = 0;
  do {
    const page = await fetchParticipantPage(engine, cursor, Math.min(pageSize, maxParticipants - seen));
    seen += page.items.length;
    yield page.items;
    cursor = page.nextCursor;
  } while (cursor !== null && seen < maxParticipants);
  if (cursor !== null) logger.warn("participants-cap-reached", { maxParticipants });
}

async function fetchParticipantPage(engine, cursor, limit) {
  let page;
  try {
    page = await engine.participantsPort.iterate({ cursor, limit });
  } catch (error) {
    throw new TickAbort("participants", error);
  }
  const validCursor = page?.nextCursor === null || typeof page?.nextCursor === "string";
  if (!Array.isArray(page?.items) || !validCursor || page.items.length > limit) {
    throw new TickAbort("participants", new TypeError("participants.iterate must resolve to { items (<= limit), nextCursor }"));
  }
  return page;
}

async function evaluateParticipant(engine, tick, window, logger, tasks, raw) {
  const intake = intakeParticipant(raw);
  if (!intake.ok) {
    logger.debug(intake.reason === "participantInvalidTimezone" ? "participant-invalid-timezone" : "participant-invalid", { participantId: raw?.id });
    return [intake.reason];
  }
  const outcomes = [];
  for (const task of tasks) {
    outcomes.push(...(await evaluateSubject(engine, tick, window, logger, task, intake.participant, intake.participant.timeZone)));
  }
  return outcomes;
}

// Copies at intake so plugins and records never hold references the app still mutates.
function intakeParticipant(raw) {
  const hasValidId = typeof raw?.id === "string" && raw.id !== "" && raw.id.length <= MAX_PARTICIPANT_ID_LENGTH;
  if (!hasValidId) return { ok: false, reason: "participantInvalid" };
  if (!isValidTimeZone(raw.timeZone)) return { ok: false, reason: "participantInvalidTimezone" };
  try {
    return { ok: true, participant: deepFreeze(structuredClone(raw)) };
  } catch {
    // structuredClone rejects functions and other non-data values; such a participant is not usable data.
    return { ok: false, reason: "participantInvalid" };
  }
}

async function evaluateSubject(engine, tick, window, logger, task, participant, timeZone) {
  const scheduleInput = { task, participant, timeZone, window, preferenceResolver: engine.preferenceResolver, pluginTimeoutMs: engine.options.pluginTimeoutMs, logger };
  const { due, outcomes } = await findDueOccurrences(scheduleInput);
  const decisionOutcomes = [];
  for (const occurrence of due) {
    const point = { task, participant, timeZone, ...occurrence };
    decisionOutcomes.push("occurrence", ...(await processDecision(engine, tick, point)));
  }
  return [...outcomes, ...decisionOutcomes];
}

function summarize(tick, window, outcomes, { completed, startedAt, failedStage }) {
  return Object.freeze({
    tickId: tick.tickId,
    now: tick.now.toISOString(),
    window: window === null ? null : { from: window.from.toISOString(), to: window.to.toISOString() },
    completed,
    ...(failedStage === undefined ? {} : { failedStage }),
    counts: tallyOutcomes(outcomes),
    durationMs: Math.round(performance.now() - startedAt),
  });
}

function deepFreeze(value) {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
