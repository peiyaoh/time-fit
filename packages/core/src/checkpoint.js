import { CronExpressionParser } from "cron-parser";
import { DateTime } from "luxon";
import { err, ok } from "./result.js";
import { isValidTimeZone } from "./timeZone.js";

/**
 * @typedef {{ id: string, cron: string, offsetMinutes: number }} CronCheckpoint
 * @typedef {{ id: string, time: string, daysOfWeek: number[], offsetMinutes: number }} TimeCheckpoint
 * @typedef {{ id: string, preference: string, daysOfWeek: number[], offsetMinutes: number }} PreferenceCheckpoint
 * @typedef {CronCheckpoint | TimeCheckpoint | PreferenceCheckpoint} Checkpoint  normalized (ADR 0005 §2)
 */

export const CHECKPOINT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PREFERENCE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const ALL_DAYS_OF_WEEK = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
const MAX_OFFSET_MINUTES = 1440;
const CRON_FIELD_COUNT = 5;
const MILLISECONDS_PER_MINUTE = 60_000;
// Bounds work per call; the engine's catch-up window is at most 24 h (ADR 0005 §3).
export const MAX_WINDOW_MILLISECONDS = 31 * 24 * 60 * MILLISECONDS_PER_MINUTE;
// Real-world DST shifts are at most 2 h; a wider margin only costs an extra candidate date.
const DST_SHIFT_MARGIN_MILLISECONDS = 3 * 60 * MILLISECONDS_PER_MINUTE;

const KEYS_BY_KIND = Object.freeze({
  cron: new Set(["id", "cron", "offsetMinutes"]),
  time: new Set(["id", "time", "daysOfWeek", "offsetMinutes"]),
  preference: new Set(["id", "preference", "daysOfWeek", "offsetMinutes"]),
});

/**
 * Validates one checkpoint and returns it with defaults applied.
 * @param {unknown} input
 * @returns {import("./result.js").Result<Readonly<Checkpoint>>}
 */
export function normalizeCheckpoint(input) {
  if (!isPlainRecord(input)) return invalid("checkpoint must be an object");
  const kinds = Object.keys(KEYS_BY_KIND).filter((kind) => Object.hasOwn(input, kind));
  if (kinds.length !== 1) {
    return invalid("checkpoint must have exactly one of cron, time, preference", { id: input.id });
  }
  const kind = kinds[0];
  const unknownKey = Object.keys(input).find((key) => !KEYS_BY_KIND[kind].has(key));
  if (unknownKey !== undefined) return invalid(`unknown checkpoint field "${unknownKey}"`);
  if (typeof input.id !== "string" || !CHECKPOINT_ID_PATTERN.test(input.id)) {
    return invalid(`checkpoint id must match ${CHECKPOINT_ID_PATTERN}`, { id: input.id });
  }
  const offsetMinutes = input.offsetMinutes === undefined ? 0 : input.offsetMinutes;
  if (!Number.isInteger(offsetMinutes) || Math.abs(offsetMinutes) > MAX_OFFSET_MINUTES) {
    return invalid(`offsetMinutes must be an integer in [-1440, 1440]`, { id: input.id });
  }
  return NORMALIZERS_BY_KIND[kind](input, offsetMinutes);
}

/**
 * @param {Checkpoint} checkpoint
 * @returns {"cron" | "time" | "preference"}
 */
export function checkpointKind(checkpoint) {
  if (Object.hasOwn(checkpoint, "cron")) return "cron";
  if (Object.hasOwn(checkpoint, "time")) return "time";
  if (Object.hasOwn(checkpoint, "preference")) return "preference";
  throw new TypeError("checkpointKind: not a normalized checkpoint");
}

/**
 * Local dates whose occurrence could fall in `(from, to]`; for a preference checkpoint,
 * these are the dates the engine must ask the `preferenceResolver` about.
 * @param {{ checkpoint: TimeCheckpoint | PreferenceCheckpoint, timeZone: string, from: Date, to: Date }} input
 * @returns {ReadonlyArray<string>} ISO dates ("YYYY-MM-DD"), ascending
 */
export function localDatesForWindow({ checkpoint, timeZone, from, to }) {
  assertWindow(timeZone, from, to);
  if (checkpointKind(checkpoint) === "cron") {
    throw new TypeError("localDatesForWindow: cron checkpoints have no local-date candidates");
  }
  return Object.freeze(candidateLocalDates(checkpoint, timeZone, from, to).map((date) => date.toISODate()));
}

/**
 * All scheduled instants of `checkpoint` in the window `(from, to]` (ADR 0005).
 * @param {{ checkpoint: Checkpoint, timeZone: string, from: Date, to: Date,
 *           resolvedTimes?: Readonly<Record<string, string>> }} input
 *   `resolvedTimes` maps local date → "HH:mm" for preference checkpoints; dates without an
 *   entry have no occurrence.
 * @returns {ReadonlyArray<Date>} ascending
 */
export function occurrences({ checkpoint, timeZone, from, to, resolvedTimes = {} }) {
  assertWindow(timeZone, from, to);
  const kind = checkpointKind(checkpoint);
  if (kind === "cron") return Object.freeze(cronOccurrences(checkpoint, timeZone, from, to));
  const timeForDate =
    kind === "time" ? () => checkpoint.time : (isoDate) => resolvedTimes[isoDate];
  return Object.freeze(wallClockOccurrences(checkpoint, timeZone, from, to, timeForDate));
}

const NORMALIZERS_BY_KIND = Object.freeze({
  cron: normalizeCronCheckpoint,
  time: normalizeTimeCheckpoint,
  preference: normalizePreferenceCheckpoint,
});

function normalizeCronCheckpoint(input, offsetMinutes) {
  if (!isFiveFieldCron(input.cron)) {
    return invalid("cron must be a valid 5-field expression", { id: input.id, cron: input.cron });
  }
  return ok(Object.freeze({ id: input.id, cron: input.cron.trim(), offsetMinutes }));
}

function normalizeTimeCheckpoint(input, offsetMinutes) {
  if (typeof input.time !== "string" || !LOCAL_TIME_PATTERN.test(input.time)) {
    return invalid('time must be 24-hour "HH:mm"', { id: input.id, time: input.time });
  }
  return withDaysOfWeek(input, (daysOfWeek) => ({ id: input.id, time: input.time, daysOfWeek, offsetMinutes }));
}

function normalizePreferenceCheckpoint(input, offsetMinutes) {
  if (typeof input.preference !== "string" || !PREFERENCE_NAME_PATTERN.test(input.preference)) {
    return invalid(`preference must match ${PREFERENCE_NAME_PATTERN}`, { id: input.id });
  }
  return withDaysOfWeek(input, (daysOfWeek) => ({
    id: input.id,
    preference: input.preference,
    daysOfWeek,
    offsetMinutes,
  }));
}

function withDaysOfWeek(input, buildCheckpoint) {
  const daysOfWeek = input.daysOfWeek === undefined ? ALL_DAYS_OF_WEEK : input.daysOfWeek;
  if (!isValidDaysOfWeek(daysOfWeek)) {
    return invalid("daysOfWeek must be a non-empty list of distinct ISO weekdays 1-7", { id: input.id });
  }
  const sortedDays = Object.freeze([...daysOfWeek].sort((a, b) => a - b));
  return ok(Object.freeze(buildCheckpoint(sortedDays)));
}

function isValidDaysOfWeek(daysOfWeek) {
  return (
    Array.isArray(daysOfWeek) &&
    daysOfWeek.length > 0 &&
    daysOfWeek.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
    new Set(daysOfWeek).size === daysOfWeek.length
  );
}

function isFiveFieldCron(expression) {
  if (typeof expression !== "string") return false;
  if (expression.trim().split(/\s+/).length !== CRON_FIELD_COUNT) return false;
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    // The parser reports syntax errors only by throwing; invalid syntax is the answer here.
    return false;
  }
}

function cronOccurrences(checkpoint, timeZone, from, to) {
  // Enumerate the unshifted schedule over the window moved back by the offset, then shift.
  const offsetMilliseconds = checkpoint.offsetMinutes * MILLISECONDS_PER_MINUTE;
  const iterator = CronExpressionParser.parse(checkpoint.cron, {
    tz: timeZone,
    currentDate: new Date(from.getTime() - offsetMilliseconds),
    endDate: new Date(to.getTime() - offsetMilliseconds + 1),
  });
  const instants = [];
  while (iterator.hasNext()) {
    const instant = iterator.next().toDate().getTime() + offsetMilliseconds;
    if (isInWindow(instant, from, to)) instants.push(new Date(instant));
  }
  return instants;
}

function wallClockOccurrences(checkpoint, timeZone, from, to, timeForDate) {
  const offsetMilliseconds = checkpoint.offsetMinutes * MILLISECONDS_PER_MINUTE;
  const instants = [];
  for (const localDate of candidateLocalDates(checkpoint, timeZone, from, to)) {
    const localTime = timeForDate(localDate.toISODate());
    if (localTime === undefined) continue;
    const instant = localDateTimeMillis(localDate, localTime, timeZone) + offsetMilliseconds;
    if (isInWindow(instant, from, to)) instants.push(new Date(instant));
  }
  return instants;
}

// Luxon resolves a nonexistent (DST gap) local time forward by the gap and an ambiguous
// (DST fold) one to its first occurrence, which is the ADR 0005 §2 policy.
function localDateTimeMillis(localDate, localTime, timeZone) {
  const match = LOCAL_TIME_PATTERN.exec(localTime);
  if (match === null) throw new TypeError(`occurrences: invalid local time "${localTime}"`);
  const [, hour, minute] = match;
  return DateTime.fromObject(
    { year: localDate.year, month: localDate.month, day: localDate.day, hour: Number(hour), minute: Number(minute) },
    { zone: timeZone },
  ).toMillis();
}

function candidateLocalDates(checkpoint, timeZone, from, to) {
  const offsetMilliseconds = checkpoint.offsetMinutes * MILLISECONDS_PER_MINUTE;
  const firstDate = localStartOfDay(from.getTime() - offsetMilliseconds, timeZone).minus({ days: 1 });
  const lastDate = localStartOfDay(to.getTime() - offsetMilliseconds, timeZone).plus({ days: 1 });
  const dates = [];
  for (let date = firstDate; date <= lastDate; date = date.plus({ days: 1 })) {
    if (checkpoint.daysOfWeek.includes(date.weekday) && dayCanReachWindow(date, offsetMilliseconds, from, to)) {
      dates.push(date);
    }
  }
  return dates;
}

function dayCanReachWindow(localDate, offsetMilliseconds, from, to) {
  const earliest = localDate.startOf("day").toMillis() + offsetMilliseconds - DST_SHIFT_MARGIN_MILLISECONDS;
  const latest = localDate.endOf("day").toMillis() + offsetMilliseconds + DST_SHIFT_MARGIN_MILLISECONDS;
  return earliest <= to.getTime() && latest > from.getTime();
}

function localStartOfDay(epochMilliseconds, timeZone) {
  return DateTime.fromMillis(epochMilliseconds, { zone: timeZone }).startOf("day");
}

function isInWindow(instant, from, to) {
  return instant > from.getTime() && instant <= to.getTime();
}

function assertWindow(timeZone, from, to) {
  if (!isValidTimeZone(timeZone)) throw new TypeError(`occurrences: invalid time zone "${timeZone}"`);
  if (!isValidDate(from) || !isValidDate(to)) throw new TypeError("occurrences: from/to must be valid Dates");
  const span = to.getTime() - from.getTime();
  if (span < 0 || span > MAX_WINDOW_MILLISECONDS) {
    throw new RangeError("occurrences: window must satisfy from <= to and span <= 31 days");
  }
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message, details) {
  return err("invalid-checkpoint", message, details);
}
