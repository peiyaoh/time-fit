import { DateTime } from "luxon";
import { readOwnPath } from "../eligibility.js";
import { err, ok } from "../result.js";

/**
 * Built-in `time-window` condition (ADR 0006): met when the decision's scheduled time lies
 * between two endpoints, each derived from `scheduledAt` or a participant attribute,
 * optionally rounded to the start of a day/week and then offset. Generalizes the legacy
 * `TimeInPeriodCondition`.
 *
 * params: { start: Endpoint, end: Endpoint, inclusive?: boolean (default true) }
 * Endpoint: { reference: "scheduledAt" | dottedPath, startOf?: "day" | "week",
 *             offset?: { minutes?: int, hours?: int, days?: int } }
 */

const ENDPOINT_KEYS = new Set(["reference", "startOf", "offset"]);
const OFFSET_UNITS = new Set(["minutes", "hours", "days"]);
const START_OF_UNITS = new Set(["day", "week"]);
const PARAM_KEYS = new Set(["start", "end", "inclusive"]);
const SCHEDULED_AT_REFERENCE = "scheduledAt";
const REFERENCE_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
const MAX_OFFSET_MAGNITUDE = 100_000;

export const timeWindowCondition = Object.freeze({
  type: "time-window",
  validate: validateTimeWindowParams,
  evaluate: evaluateTimeWindow,
});

/**
 * @param {object} params
 * @returns {import("../result.js").Result<void>}
 */
function validateTimeWindowParams(params) {
  const unknownKey = Object.keys(params).find((key) => !PARAM_KEYS.has(key));
  if (unknownKey !== undefined) return err("invalid-time-window", `unknown field "${unknownKey}"`);
  if (params.inclusive !== undefined && typeof params.inclusive !== "boolean") {
    return err("invalid-time-window", "inclusive must be a boolean");
  }
  const badEndpoint = ["start", "end"].find((name) => !isValidEndpoint(params[name]));
  return badEndpoint === undefined ? ok(undefined) : err("invalid-time-window", `invalid ${badEndpoint} endpoint`);
}

/**
 * @param {object} params
 * @param {import("../engine/plugins.js").PluginContext} ctx
 * @returns {Promise<import("../precondition.js").ConditionResult>}
 */
async function evaluateTimeWindow(params, ctx) {
  const at = DateTime.fromJSDate(ctx.scheduledAt, { zone: ctx.timeZone });
  const start = resolveEndpoint(params.start, at, ctx);
  const end = resolveEndpoint(params.end, at, ctx);
  const missing = [start, end].find((endpoint) => !endpoint.ok);
  if (missing !== undefined) return missing;
  const inclusive = params.inclusive ?? true;
  const atMillis = at.toMillis();
  const beforeEnd = inclusive ? atMillis <= end.value.toMillis() : atMillis < end.value.toMillis();
  return {
    ok: true,
    met: atMillis >= start.value.toMillis() && beforeEnd,
    evidence: { start: start.value.toUTC().toISO(), end: end.value.toUTC().toISO(), at: at.toUTC().toISO() },
  };
}

function resolveEndpoint(endpoint, at, ctx) {
  const reference = endpoint.reference === SCHEDULED_AT_REFERENCE ? at : referenceFromParticipant(endpoint.reference, ctx);
  if (reference === undefined) {
    return err("time-window-reference-missing", `participant has no valid instant at "${endpoint.reference}"`);
  }
  const rounded = endpoint.startOf === undefined ? reference : reference.startOf(endpoint.startOf);
  return ok(endpoint.offset === undefined ? rounded : rounded.plus(endpoint.offset));
}

// Accepts a Date or an ISO string with an offset; anything else is treated as missing.
function referenceFromParticipant(path, ctx) {
  const raw = readOwnPath(ctx.participant, path);
  const parsed =
    raw instanceof Date
      ? DateTime.fromJSDate(raw)
      : typeof raw === "string"
        ? DateTime.fromISO(raw, { setZone: true })
        : DateTime.invalid("not a date");
  return parsed.isValid ? parsed.setZone(ctx.timeZone) : undefined;
}

function isValidEndpoint(endpoint) {
  if (typeof endpoint !== "object" || endpoint === null || Array.isArray(endpoint)) return false;
  if (Object.keys(endpoint).some((key) => !ENDPOINT_KEYS.has(key))) return false;
  if (typeof endpoint.reference !== "string" || !REFERENCE_PATTERN.test(endpoint.reference)) return false;
  if (endpoint.startOf !== undefined && !START_OF_UNITS.has(endpoint.startOf)) return false;
  return endpoint.offset === undefined || isValidOffset(endpoint.offset);
}

function isValidOffset(offset) {
  if (typeof offset !== "object" || offset === null || Array.isArray(offset)) return false;
  const entries = Object.entries(offset);
  return (
    entries.length > 0 &&
    entries.every(([unit, amount]) => OFFSET_UNITS.has(unit) && Number.isInteger(amount) && Math.abs(amount) <= MAX_OFFSET_MAGNITUDE)
  );
}
