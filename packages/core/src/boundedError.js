/**
 * Bounds for error fields that the engine persists in decision records and logs (ADR 0013).
 * Lengths are in UTF-16 code units and include the truncation marker.
 */
export const MAX_ERROR_CODE_LENGTH = 128;
export const MAX_ERROR_MESSAGE_LENGTH = 1024;
export const MAX_ERROR_STACK_LENGTH = 4096;
export const TRUNCATION_MARKER = "…";

/**
 * Returns `text` unchanged if it fits, otherwise a prefix ending in the truncation marker, with
 * total length at most `maxLength`. The cut never splits a surrogate pair.
 * @param {string} text
 * @param {number} maxLength  integer >= 2
 * @returns {string}
 */
export function truncateText(text, maxLength) {
  if (typeof text !== "string") throw new TypeError("truncateText: text must be a string");
  if (!Number.isInteger(maxLength) || maxLength < 2) throw new TypeError("truncateText: maxLength must be an integer >= 2");
  if (text.length <= maxLength) return text;
  let end = maxLength - TRUNCATION_MARKER.length;
  if (isHighSurrogate(text.charCodeAt(end - 1))) end -= 1;
  return text.slice(0, end) + TRUNCATION_MARKER;
}

/**
 * A detached `{ code, message, stack? }` with each field bounded. Other fields are dropped.
 * @param {{ code: string, message?: unknown, stack?: unknown }} error
 * @returns {{ code: string, message: string, stack?: string }}
 */
export function boundError({ code, message, stack }) {
  if (typeof code !== "string") throw new TypeError("boundError: code must be a string");
  const bounded = {
    code: truncateText(code, MAX_ERROR_CODE_LENGTH),
    message: truncateText(String(message ?? ""), MAX_ERROR_MESSAGE_LENGTH),
  };
  return typeof stack === "string" ? { ...bounded, stack: truncateText(stack, MAX_ERROR_STACK_LENGTH) } : bounded;
}

function isHighSurrogate(charCode) {
  return charCode >= 0xd800 && charCode <= 0xdbff;
}
