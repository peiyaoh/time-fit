import { evaluateEligibility } from "../eligibility.js";
import { computeDecisionId, decisionSubject } from "../identity.js";
import { evaluatePrecondition } from "../precondition.js";
import { randomize } from "../randomization.js";
import { bindLogger, describeError } from "./logging.js";
import { capPayload, invokeIsolated, normalizeActionResult } from "./plugins.js";

export const DECISION_RECORD_SCHEMA = "time-fit.decision/v1";

/**
 * Runs one (task, participant, occurrence) through the ADR 0004 §5 pipeline:
 * eligibility → availability → claim → execute → complete/fail.
 * @param {object} engine    resolved engine config (ports, registries, services, options)
 * @param {{ tickId: string, now: Date }} tick
 * @param {{ task: { spec: object, taskVersion: string }, participant: object | null,
 *           timeZone: string, checkpointId: string, scheduledAt: Date }} point
 * @returns {Promise<import("./summary.js").TickOutcome[]>}
 */
export async function processDecision(engine, tick, point) {
  const { task, participant, scheduledAt } = point;
  const eligibility = evaluateEligibility({ task: task.spec, participant, scheduledAt });
  if (!eligibility.eligible) return ["ineligible"];

  const identity = decisionIdentity(point);
  const logger = bindLogger(engine.logger, {
    tickId: tick.tickId,
    decisionId: identity.decisionId,
    taskId: task.spec.id,
    participantId: identity.participantId,
  });
  const context = { engine, tick, point, identity, logger };
  const availability = await evaluateAvailability(context);
  const record = baseRecord(context, availability);
  if (!availability.available) return recordUnavailable(context, record);
  return claimAndExecute(context, record);
}

function decisionIdentity({ task, participant, checkpointId, scheduledAt }) {
  const participantId = task.spec.scope === "system" ? null : participant.id;
  const subject = decisionSubject({ scope: task.spec.scope, participantId });
  const decisionId = computeDecisionId({ subject, taskId: task.spec.id, checkpointId, scheduledAt });
  return { decisionId, participantId };
}

async function evaluateAvailability(context) {
  const { engine, point, identity, logger } = context;
  const evaluateCondition = (condition, path) => {
    const { type, ...params } = condition;
    const plugin = engine.conditionTypes.get(type);
    const pluginContext = pluginContextFor(context, `condition:${path}`);
    return invokeIsolated((signal) => plugin.evaluate(params, { ...pluginContext, signal }), engine.options.pluginTimeoutMs).then(
      capConditionEvidence,
    );
  };
  const evaluation = await evaluatePrecondition(point.task.spec.precondition, evaluateCondition);
  if (evaluation.state === "error") {
    logger.warn("decision-condition-error", { decisionId: identity.decisionId, conditions: evaluation.conditions });
  }
  const reasons = { met: [], "not-met": ["precondition-not-met"], error: ["condition-error"] }[evaluation.state];
  return Object.freeze({ available: evaluation.state === "met", reasons, conditions: evaluation.conditions });
}

function pluginContextFor(context, purpose) {
  const { point, identity, logger } = context;
  return {
    decisionId: identity.decisionId,
    taskId: point.task.spec.id,
    checkpointId: point.checkpointId,
    scheduledAt: new Date(point.scheduledAt),
    timeZone: point.timeZone,
    participant: point.participant,
    logger: bindLogger(logger, { purpose }),
  };
}

function capConditionEvidence(result) {
  return result?.ok === true && result.evidence !== undefined ? { ...result, evidence: capPayload(result.evidence) } : result;
}

function baseRecord({ engine, tick, point, identity }, availability) {
  const snapshot = takeSnapshot(engine, point.participant);
  return {
    schema: DECISION_RECORD_SCHEMA,
    decisionId: identity.decisionId,
    tickId: tick.tickId,
    scope: point.task.spec.scope,
    participantId: identity.participantId,
    taskId: point.task.spec.id,
    taskVersion: point.task.taskVersion,
    checkpointId: point.checkpointId,
    scheduledAt: point.scheduledAt.toISOString(),
    timeZone: point.timeZone,
    evaluatedAt: tick.now.toISOString(),
    latenessMs: tick.now.getTime() - point.scheduledAt.getTime(),
    availability,
    ...(snapshot === undefined ? {} : { snapshot }),
  };
}

function takeSnapshot(engine, participant) {
  if (engine.snapshot === null || participant === null) return undefined;
  try {
    return capPayload(engine.snapshot(participant));
  } catch (error) {
    return { snapshotFailed: describeError(error, "snapshot-threw") };
  }
}

async function recordUnavailable(context, record) {
  if (!context.point.task.spec.logUnavailable) return ["unavailable"];
  const unavailableRecord = { ...record, randomization: null, action: null, state: "unavailable", claimedAt: context.tick.now.toISOString() };
  const claim = await tryClaim(context, unavailableRecord);
  if (claim === "failed") return ["unavailable", "claimFailed"];
  return claim === "claimed" ? ["unavailable", "unavailableRecorded"] : ["unavailable", "skippedClaimed"];
}

async function claimAndExecute(context, record) {
  const { engine, point, identity } = context;
  const randomization = randomize({
    outcomes: point.task.spec.outcomes,
    decisionId: identity.decisionId,
    studySalt: engine.studySalt,
    random: engine.random,
  });
  const action = point.task.spec.outcomes.find((outcome) => outcome.id === randomization.armId).action;
  const claimedRecord = { ...record, randomization, action, state: "claimed", claimedAt: context.tick.now.toISOString() };
  const claim = await tryClaim(context, claimedRecord);
  if (claim === "failed") return ["claimFailed"];
  if (claim === "skipped") return ["skippedClaimed"];
  const result = action === null ? { ok: true, delivery: null } : await executeAction(context, action);
  return ["claimed", ...(await finalize(context, result))];
}

async function tryClaim({ engine, tick, identity, logger }, record) {
  try {
    const { claimed } = await engine.decisionLog.claim(Object.freeze(record), { token: tick.tickId });
    if (!claimed) logger.debug("decision-already-claimed", {});
    return claimed === true ? "claimed" : "skipped";
  } catch (error) {
    logger.error("decision-claim-failed", { decisionId: identity.decisionId, error: describeError(error) });
    return "failed";
  }
}

async function executeAction(context, action) {
  const { engine } = context;
  const { type, ...params } = action;
  const plugin = engine.actionTypes.get(type);
  const pluginContext = pluginContextFor(context, `action:${type}`);
  const raw = await invokeIsolated((signal) => plugin.execute(params, { ...pluginContext, signal }), engine.options.pluginTimeoutMs);
  return normalizeActionResult(raw);
}

async function finalize({ engine, tick, identity, logger }, result) {
  const finishedAt = tick.now.toISOString();
  try {
    if (result.ok) {
      await engine.decisionLog.complete(identity.decisionId, { finishedAt, delivery: result.delivery ?? null });
      return ["completed"];
    }
    logger.warn("decision-action-failed", { error: result.error });
    await engine.decisionLog.fail(identity.decisionId, { finishedAt, error: result.error });
    return ["failed"];
  } catch (error) {
    // The record stays "claimed": visible and never re-sent (ADR 0004 §6).
    logger.error("decision-finalize-failed", { error: describeError(error) });
    return [result.ok ? "completed" : "failed", "finalizeFailed"];
  }
}
