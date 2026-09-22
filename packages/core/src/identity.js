import { createHash } from "node:crypto";
import { canonicalJson } from "./canonicalJson.js";

/** Bump only with a new ADR: changing it re-keys every future decision. */
export const DECISION_ID_VERSION = "v1";

const SYSTEM_SUBJECT = "s:system";
const PARTICIPANT_SUBJECT_PREFIX = "p:";

/**
 * The prefix keeps a participant whose id is literally "system" from colliding with
 * system-scope decisions (ADR 0004 §1).
 * @param {{ scope: "participant" | "system", participantId?: string }} input
 * @returns {string}
 */
export function decisionSubject({ scope, participantId }) {
  if (scope === "system") return SYSTEM_SUBJECT;
  if (scope === "participant" && typeof participantId === "string" && participantId !== "") {
    return PARTICIPANT_SUBJECT_PREFIX + participantId;
  }
  throw new TypeError(`decisionSubject: invalid scope/participantId (${scope}, ${participantId})`);
}

/**
 * Identifies a decision point, not the configuration that evaluated it: editing a task
 * never yields a second id for the same point (ADR 0004 §1).
 * @param {{ subject: string, taskId: string, checkpointId: string, scheduledAt: Date }} input
 * @returns {string} lowercase hex sha256
 */
export function computeDecisionId({ subject, taskId, checkpointId, scheduledAt }) {
  assertNonEmptyStrings({ subject, taskId, checkpointId });
  assertValidDate(scheduledAt);
  const keyMaterial = JSON.stringify([
    DECISION_ID_VERSION,
    subject,
    taskId,
    checkpointId,
    scheduledAt.toISOString(),
  ]);
  return sha256Hex(keyMaterial);
}

/**
 * @param {object} normalizedTaskSpec the validated spec with defaults applied
 * @returns {string} lowercase hex sha256 of its canonical JSON
 */
export function computeTaskVersion(normalizedTaskSpec) {
  return sha256Hex(canonicalJson(normalizedTaskSpec));
}

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

function assertNonEmptyStrings(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value === "") {
      throw new TypeError(`computeDecisionId: ${name} must be a non-empty string`);
    }
  }
}

function assertValidDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError("computeDecisionId: scheduledAt must be a valid Date");
  }
}
