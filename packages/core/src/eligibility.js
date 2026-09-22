import { err, ok } from "./result.js";

/**
 * @typedef {object} EligibilitySpec  (ADR 0001 §3)
 * @property {string[]} [participantIds]
 * @property {{ mode: "all" | "any", match: Record<string, Array<string | number | boolean | null>> }} [attributes]
 */

/**
 * @typedef {{ eligible: true } | { eligible: false, reason: IneligibilityReason }} EligibilityVerdict
 * @typedef {"task-disabled" | "before-active-from" | "at-or-after-active-until"
 *   | "not-in-participant-ids" | "attributes-not-matched"} IneligibilityReason
 */

export const MAX_PARTICIPANT_IDS = 10_000;
export const MAX_ATTRIBUTE_PATHS = 50;
const MAX_ALLOWED_VALUES = 1_000;
const MAX_PARTICIPANT_ID_LENGTH = 256;
const DOTTED_PATH_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
const ELIGIBILITY_KEYS = new Set(["participantIds", "attributes"]);
const ATTRIBUTE_KEYS = new Set(["mode", "match"]);
// Path segments that would read through the prototype chain instead of participant data.
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * @param {unknown} eligibility
 * @returns {import("./result.js").Result<void>}
 */
export function validateEligibility(eligibility) {
  if (!isPlainRecord(eligibility)) return invalid("eligibility must be an object");
  const unknownKey = Object.keys(eligibility).find((key) => !ELIGIBILITY_KEYS.has(key));
  if (unknownKey !== undefined) return invalid(`unknown eligibility field "${unknownKey}"`);
  if (eligibility.participantIds !== undefined) {
    const idsResult = validateParticipantIds(eligibility.participantIds);
    if (!idsResult.ok) return idsResult;
  }
  if (eligibility.attributes !== undefined) return validateAttributes(eligibility.attributes);
  return ok(undefined);
}

/**
 * Decides whether a (participant, occurrence) pair is in a task's population. Ineligible
 * pairs produce no decision record (ADR 0001 §3).
 * @param {{ task: { enabled: boolean, scope: string, activeFrom?: string, activeUntil?: string,
 *                   eligibility?: EligibilitySpec },
 *           participant: object | null, scheduledAt: Date }} input
 * @returns {EligibilityVerdict}
 */
export function evaluateEligibility({ task, participant, scheduledAt }) {
  assertEligibilityInput(task, participant, scheduledAt);
  if (task.enabled === false) return ineligible("task-disabled");
  const instant = scheduledAt.getTime();
  if (task.activeFrom !== undefined && instant < Date.parse(task.activeFrom)) {
    return ineligible("before-active-from");
  }
  if (task.activeUntil !== undefined && instant >= Date.parse(task.activeUntil)) {
    return ineligible("at-or-after-active-until");
  }
  if (task.scope === "system" || task.eligibility === undefined) return ELIGIBLE;
  return evaluateParticipantFilter(task.eligibility, participant);
}

/**
 * Reads a dotted path through own properties only.
 * @param {unknown} source
 * @param {string} dottedPath
 * @returns {unknown} undefined when any segment is missing
 */
export function readOwnPath(source, dottedPath) {
  let current = source;
  for (const segment of dottedPath.split(".")) {
    if (typeof current !== "object" || current === null || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

const ELIGIBLE = Object.freeze({ eligible: true });

function assertEligibilityInput(task, participant, scheduledAt) {
  if (typeof task !== "object" || task === null) throw new TypeError("evaluateEligibility: task must be an object");
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new TypeError("evaluateEligibility: scheduledAt must be a valid Date");
  }
  const needsParticipant = task.scope === "participant";
  if (needsParticipant && (typeof participant !== "object" || participant === null || typeof participant.id !== "string")) {
    throw new TypeError("evaluateEligibility: participant tasks require a participant with a string id");
  }
}

function evaluateParticipantFilter(eligibility, participant) {
  if (eligibility.participantIds !== undefined && !eligibility.participantIds.includes(participant.id)) {
    return ineligible("not-in-participant-ids");
  }
  if (eligibility.attributes !== undefined && !attributesMatch(eligibility.attributes, participant)) {
    return ineligible("attributes-not-matched");
  }
  return ELIGIBLE;
}

function attributesMatch({ mode, match }, participant) {
  const pathMatches = ([path, allowedValues]) => allowedValues.includes(readOwnPath(participant, path));
  const entries = Object.entries(match);
  return mode === "all" ? entries.every(pathMatches) : entries.some(pathMatches);
}

function validateParticipantIds(participantIds) {
  const isValidId = (id) => typeof id === "string" && id !== "" && id.length <= MAX_PARTICIPANT_ID_LENGTH;
  if (!Array.isArray(participantIds) || participantIds.length === 0 || participantIds.length > MAX_PARTICIPANT_IDS) {
    return invalid(`participantIds must be a non-empty array of at most ${MAX_PARTICIPANT_IDS} ids`);
  }
  if (!participantIds.every(isValidId)) return invalid("participantIds must be non-empty strings");
  return ok(undefined);
}

function validateAttributes(attributes) {
  if (!isPlainRecord(attributes)) return invalid("attributes must be an object");
  const unknownKey = Object.keys(attributes).find((key) => !ATTRIBUTE_KEYS.has(key));
  if (unknownKey !== undefined) return invalid(`unknown attributes field "${unknownKey}"`);
  if (attributes.mode !== "all" && attributes.mode !== "any") {
    return invalid('attributes.mode must be "all" or "any"');
  }
  if (!isPlainRecord(attributes.match)) return invalid("attributes.match must be an object");
  const entries = Object.entries(attributes.match);
  if (entries.length === 0 || entries.length > MAX_ATTRIBUTE_PATHS) {
    return invalid(`attributes.match must have 1-${MAX_ATTRIBUTE_PATHS} paths`);
  }
  const badEntry = entries.find(([path, values]) => !isValidPath(path) || !isValidAllowedValues(values));
  if (badEntry !== undefined) return invalid(`invalid attributes.match entry "${badEntry[0]}"`);
  return ok(undefined);
}

function isValidPath(path) {
  return DOTTED_PATH_PATTERN.test(path) && !path.split(".").some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment));
}

function isValidAllowedValues(values) {
  const isPrimitive = (value) =>
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
  return Array.isArray(values) && values.length > 0 && values.length <= MAX_ALLOWED_VALUES && values.every(isPrimitive);
}

function ineligible(reason) {
  return Object.freeze({ eligible: false, reason });
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message) {
  return err("invalid-eligibility", message);
}
