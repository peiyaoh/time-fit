import { LOCAL_TIME_PATTERN, checkpointKind, localDatesForWindow, occurrences } from "../checkpoint.js";
import { invokeIsolated } from "./plugins.js";

/**
 * @typedef {{ checkpointId: string, scheduledAt: Date }} DueOccurrence
 */

/**
 * All checkpoint occurrences of one task, for one participant (or the system scope), in the
 * tick window. Preference checkpoints ask the resolver once per candidate local date.
 * @param {{ task: { spec: import("../taskSpec.js").TaskSpec }, participant: object | null,
 *           timeZone: string, window: { from: Date, to: Date },
 *           occurrenceMemo: Map<string, ReadonlyArray<number>>,
 *           preferenceResolver: Function | null, pluginTimeoutMs: number,
 *           logger: import("./logging.js").Logger }} input
 * @returns {Promise<{ due: DueOccurrence[], outcomes: import("./summary.js").TickOutcome[] }>}
 */
export async function findDueOccurrences(input) {
  const perCheckpoint = [];
  for (const checkpoint of input.task.spec.checkpoints) {
    perCheckpoint.push(await occurrencesForCheckpoint(checkpoint, input));
  }
  return {
    due: perCheckpoint.flatMap((result) => result.due),
    outcomes: perCheckpoint.flatMap((result) => result.outcomes),
  };
}

async function occurrencesForCheckpoint(checkpoint, input) {
  const { timeZone, window } = input;
  const base = { checkpoint, timeZone, from: window.from, to: window.to };
  const kind = checkpointKind(checkpoint);
  const resolution = kind === "preference" ? await resolvePreferenceTimes(checkpoint, input) : { resolvedTimes: {}, outcomes: [] };
  const scheduledAt = kind === "preference"
    ? occurrences({ ...base, resolvedTimes: resolution.resolvedTimes })
    : memoizedOccurrences(input.task.taskVersion, checkpoint, base, input.occurrenceMemo);
  const due = scheduledAt.map((instant) => ({
    checkpointId: checkpoint.id,
    scheduledAt: instant,
  }));
  return { due, outcomes: resolution.outcomes };
}

function memoizedOccurrences(taskVersion, checkpoint, { timeZone, from, to }, occurrenceMemo) {
  const key = JSON.stringify([taskVersion, checkpoint.id, timeZone, from.toISOString(), to.toISOString()]);
  const milliseconds = occurrenceMemo.get(key) ?? cacheOccurrences(key, checkpoint, timeZone, from, to, occurrenceMemo);
  return milliseconds.map((instant) => new Date(instant));
}

function cacheOccurrences(key, checkpoint, timeZone, from, to, occurrenceMemo) {
  const milliseconds = Object.freeze(occurrences({ checkpoint, timeZone, from, to }).map((instant) => instant.getTime()));
  occurrenceMemo.set(key, milliseconds);
  return milliseconds;
}

async function resolvePreferenceTimes(checkpoint, input) {
  const { task, participant, timeZone, window, preferenceResolver, pluginTimeoutMs, logger } = input;
  const dates = localDatesForWindow({ checkpoint, timeZone, from: window.from, to: window.to });
  const request = Object.freeze({ taskId: task.spec.id, checkpointId: checkpoint.id, preference: checkpoint.preference });
  const entries = [];
  const outcomes = [];
  for (const localDate of dates) {
    const result = await invokeIsolated(() => preferenceResolver(participant, request, localDate), pluginTimeoutMs);
    if (isResolvedTime(result)) {
      entries.push([localDate, result.value]);
    } else {
      outcomes.push("preferenceUnresolved");
      logger.debug("preference-unresolved", { ...request, localDate, error: result?.error ?? { code: "invalid-preference-result" } });
    }
  }
  return { resolvedTimes: Object.fromEntries(entries), outcomes };
}

function isResolvedTime(result) {
  return result?.ok === true && typeof result.value === "string" && LOCAL_TIME_PATTERN.test(result.value);
}
