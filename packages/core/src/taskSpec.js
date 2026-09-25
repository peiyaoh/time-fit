import { DateTime } from "luxon";
import { checkpointKind, normalizeCheckpoint } from "./checkpoint.js";
import { validateEligibility } from "./eligibility.js";
import { computeTaskVersion } from "./identity.js";
import { validateOutcomes } from "./outcomes.js";
import { assertValidationContext } from "./pluginParams.js";
import { validatePrecondition } from "./precondition.js";
import { err, ok } from "./result.js";
import { isValidTimeZone } from "./timeZone.js";

/**
 * @typedef {object} TaskSpec  normalized v1 task spec (ADR 0006)
 * @property {string} id
 * @property {boolean} enabled
 * @property {"participant" | "system"} scope
 * @property {string} [timeZone]            present iff scope === "system"
 * @property {number} priority
 * @property {string} [activeFrom]          ISO UTC
 * @property {string} [activeUntil]         ISO UTC
 * @property {import("./eligibility.js").EligibilitySpec} [eligibility]
 * @property {ReadonlyArray<import("./checkpoint.js").Checkpoint>} checkpoints
 * @property {import("./precondition.js").PreconditionNode} [precondition]
 * @property {ReadonlyArray<{ id: string, probability: number, action: object | null }>} outcomes
 * @property {boolean} logUnavailable
 */

export const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
export const MAX_CHECKPOINTS = 50;
export const DEFAULT_MAX_TASKS = 500;
const DEFAULT_PRIORITY = 100;
const MAX_ABSOLUTE_PRIORITY = 1_000_000;
// Requires an explicit offset so an instant never depends on the server's local zone.
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const TASK_KEYS = new Set([
  "id", "enabled", "scope", "timeZone", "priority", "activeFrom", "activeUntil",
  "eligibility", "checkpoints", "precondition", "outcomes", "logUnavailable",
]);

/**
 * Validates a task spec and returns a deep-frozen copy with defaults applied.
 * @param {unknown} spec
 * @param {import("./pluginParams.js").ValidationContext} context
 * @returns {import("./result.js").Result<Readonly<TaskSpec>>}
 */
export function validateTaskSpec(spec, context) {
  assertValidationContext(context);
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    return err("invalid-spec", "task spec must be an object");
  }
  const unknownKey = Object.keys(spec).find((key) => !TASK_KEYS.has(key));
  if (unknownKey !== undefined) return err("unknown-field", `unknown task field "${unknownKey}"`, { taskId: spec.id });
  for (const check of TASK_CHECKS) {
    const result = check(spec, context);
    if (!result.ok) return withTaskId(result, spec.id);
  }
  const checkpoints = spec.checkpoints.map((checkpoint) => normalizeCheckpoint(checkpoint).value);
  return ok(deepFreeze(normalizedTask(spec, checkpoints)));
}

/**
 * Validates a set of specs independently. Invalid, duplicate, or over-cap specs are
 * rejected individually so the rest can run (ADR 0002).
 * @param {ReadonlyArray<unknown>} specs
 * @param {import("./pluginParams.js").ValidationContext} context
 * @param {{ maxTasks?: number }} [options]
 * @returns {{ tasks: ReadonlyArray<{ spec: Readonly<TaskSpec>, taskVersion: string }>,
 *             rejected: ReadonlyArray<{ index: number, taskId: unknown, error: import("./result.js").ContractError }> }}
 */
export function validateTaskSet(specs, context, { maxTasks = DEFAULT_MAX_TASKS } = {}) {
  if (!Array.isArray(specs)) throw new TypeError("validateTaskSet: specs must be an array");
  if (!Number.isInteger(maxTasks) || maxTasks < 1) throw new TypeError("validateTaskSet: maxTasks must be a positive integer");
  const seenIds = new Set();
  const tasks = [];
  const rejected = [];
  for (const [index, spec] of specs.entries()) {
    const result = validateWithinSet(spec, index, seenIds, context, maxTasks);
    if (result.ok) {
      seenIds.add(result.value.id);
      tasks.push(Object.freeze({ spec: result.value, taskVersion: computeTaskVersion(result.value) }));
    } else {
      rejected.push(Object.freeze({ index, taskId: spec?.id, error: result.error }));
    }
  }
  return Object.freeze({ tasks: Object.freeze(tasks), rejected: Object.freeze(rejected) });
}

function validateWithinSet(spec, index, seenIds, context, maxTasks) {
  if (index >= maxTasks) return err("task-cap-exceeded", `more than ${maxTasks} tasks`);
  const result = validateTaskSpec(spec, context);
  if (result.ok && seenIds.has(result.value.id)) {
    return err("duplicate-task-id", `task id "${result.value.id}" appears more than once`);
  }
  return result;
}

const TASK_CHECKS = Object.freeze([
  checkId,
  checkScopeAndTimeZone,
  checkScalarFields,
  checkActiveRange,
  checkCheckpoints,
  checkPreferenceResolver,
  checkEligibility,
  checkPrecondition,
  (spec, context) => validateOutcomes(spec.outcomes, context),
]);

function checkId(spec) {
  if (typeof spec.id === "string" && TASK_ID_PATTERN.test(spec.id)) return ok(undefined);
  return err("invalid-id", `task id must match ${TASK_ID_PATTERN}`);
}

function checkScopeAndTimeZone(spec) {
  if (spec.scope !== "participant" && spec.scope !== "system") {
    return err("invalid-scope", 'scope must be "participant" or "system"');
  }
  if (spec.scope === "participant") {
    return spec.timeZone === undefined
      ? ok(undefined)
      : err("time-zone-not-allowed", "participant tasks use each participant's time zone");
  }
  return isValidTimeZone(spec.timeZone)
    ? ok(undefined)
    : err("invalid-time-zone", "system tasks require an IANA timeZone");
}

function checkScalarFields(spec) {
  const isOptionalBoolean = (value) => value === undefined || typeof value === "boolean";
  if (!isOptionalBoolean(spec.enabled)) return err("invalid-field", "enabled must be a boolean");
  if (!isOptionalBoolean(spec.logUnavailable)) return err("invalid-field", "logUnavailable must be a boolean");
  const { priority } = spec;
  if (priority !== undefined && !(Number.isInteger(priority) && Math.abs(priority) <= MAX_ABSOLUTE_PRIORITY)) {
    return err("invalid-field", `priority must be an integer within ±${MAX_ABSOLUTE_PRIORITY}`);
  }
  return ok(undefined);
}

function checkActiveRange(spec) {
  const bounds = [spec.activeFrom, spec.activeUntil].filter((bound) => bound !== undefined);
  if (!bounds.every(isIsoInstant)) return err("invalid-active-range", "activeFrom/activeUntil must be ISO instants with an offset");
  if (bounds.length === 2 && Date.parse(spec.activeFrom) >= Date.parse(spec.activeUntil)) {
    return err("invalid-active-range", "activeFrom must be before activeUntil");
  }
  return ok(undefined);
}

function checkCheckpoints(spec) {
  const { checkpoints } = spec;
  if (!Array.isArray(checkpoints) || checkpoints.length === 0 || checkpoints.length > MAX_CHECKPOINTS) {
    return err("invalid-checkpoint", `checkpoints must be an array of 1-${MAX_CHECKPOINTS} entries`);
  }
  for (const checkpoint of checkpoints) {
    const result = normalizeCheckpoint(checkpoint);
    if (!result.ok) return result;
  }
  if (new Set(checkpoints.map((checkpoint) => checkpoint.id)).size !== checkpoints.length) {
    return err("invalid-checkpoint", "checkpoint ids must be unique within a task");
  }
  return ok(undefined);
}

function checkPreferenceResolver(spec, context) {
  const needsResolver = spec.checkpoints.some((checkpoint) => checkpointKind(checkpoint) === "preference");
  if (needsResolver && !context.hasPreferenceResolver) {
    return err("missing-preference-resolver", "a preference checkpoint requires a preferenceResolver");
  }
  return ok(undefined);
}

function checkEligibility(spec) {
  if (spec.eligibility === undefined) return ok(undefined);
  if (spec.scope === "system") return err("invalid-eligibility", "system tasks have no participant eligibility");
  return validateEligibility(spec.eligibility);
}

function checkPrecondition(spec, context) {
  return spec.precondition === undefined ? ok(undefined) : validatePrecondition(spec.precondition, context);
}

function normalizedTask(spec, checkpoints) {
  const optional = (key, value) => (value === undefined ? {} : { [key]: value });
  return {
    id: spec.id,
    enabled: spec.enabled ?? true,
    scope: spec.scope,
    ...optional("timeZone", spec.timeZone),
    priority: spec.priority ?? DEFAULT_PRIORITY,
    ...optional("activeFrom", toUtcIso(spec.activeFrom)),
    ...optional("activeUntil", toUtcIso(spec.activeUntil)),
    ...optional("eligibility", copyData(spec.eligibility)),
    checkpoints,
    ...optional("precondition", copyData(spec.precondition)),
    outcomes: copyData(spec.outcomes),
    logUnavailable: spec.logUnavailable ?? true,
  };
}

// Luxon, unlike Date.parse, rejects impossible calendar dates such as Feb 30 instead of
// silently rolling them over.
function isIsoInstant(value) {
  return typeof value === "string" && ISO_INSTANT_PATTERN.test(value) && DateTime.fromISO(value, { setZone: true }).isValid;
}

function toUtcIso(value) {
  return value === undefined ? undefined : new Date(value).toISOString();
}

function copyData(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function withTaskId(result, taskId) {
  return err(result.error.code, result.error.message, { ...result.error.details, taskId });
}

function deepFreeze(value) {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
