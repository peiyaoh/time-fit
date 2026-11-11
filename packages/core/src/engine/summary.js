/**
 * Every outcome a tick can report, one counter each (ADR 0005 §4).
 * @typedef {"occurrence" | "ineligible" | "unavailable" | "unavailableRecorded" | "claimed"
 *   | "skippedClaimed" | "completed" | "failed" | "claimFailed" | "finalizeFailed"
 *   | "preferenceUnresolved" | "participantInvalid" | "participantInvalidTimezone"
 *   | "taskRejected"} TickOutcome
 */

export const TICK_OUTCOMES = Object.freeze([
  "occurrence",
  "ineligible",
  "unavailable",
  "unavailableRecorded",
  "claimed",
  "skippedClaimed",
  "completed",
  "failed",
  "claimFailed",
  "finalizeFailed",
  "preferenceUnresolved",
  "participantInvalid",
  "participantInvalidTimezone",
  "taskRejected",
]);

/**
 * @param {ReadonlyArray<TickOutcome>} outcomes
 * @returns {Readonly<Record<TickOutcome, number>>}
 */
export function tallyOutcomes(outcomes) {
  const zeroes = Object.fromEntries(TICK_OUTCOMES.map((outcome) => [outcome, 0]));
  return Object.freeze(
    outcomes.reduce((counts, outcome) => {
      if (!Object.hasOwn(counts, outcome)) throw new TypeError(`tallyOutcomes: unknown outcome "${outcome}"`);
      return { ...counts, [outcome]: counts[outcome] + 1 };
    }, zeroes),
  );
}
