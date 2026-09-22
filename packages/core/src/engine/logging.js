/**
 * @typedef {object} Logger  structured logger port (ADR 0002)
 * @property {(event: string, fields: object) => void} debug
 * @property {(event: string, fields: object) => void} info
 * @property {(event: string, fields: object) => void} warn
 * @property {(event: string, fields: object) => void} error
 */

const LOG_LEVELS = Object.freeze(["debug", "info", "warn", "error"]);

/** @type {Logger} */
export const noopLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

/**
 * @param {unknown} logger
 * @returns {boolean}
 */
export function isLogger(logger) {
  return typeof logger === "object" && logger !== null && LOG_LEVELS.every((level) => typeof logger[level] === "function");
}

/**
 * Returns a logger that adds correlation fields (tickId, decisionId, ...) to every event
 * and never lets a failing logger break the engine.
 * @param {Logger} logger
 * @param {object} boundFields
 * @returns {Logger}
 */
export function bindLogger(logger, boundFields) {
  const frozenFields = Object.freeze({ ...boundFields });
  const bound = Object.fromEntries(
    LOG_LEVELS.map((level) => [level, (event, fields = {}) => safeLog(logger, level, event, { ...frozenFields, ...fields })]),
  );
  return Object.freeze(bound);
}

/**
 * Structured fields for an error: code, message, and stack when available.
 * @param {unknown} error
 * @returns {{ code: string, message: string, stack?: string }}
 */
export function describeError(error, fallbackCode = "unexpected-error") {
  if (error instanceof Error) {
    const code = typeof error.code === "string" ? error.code : fallbackCode;
    return { code, message: error.message, ...(error.stack === undefined ? {} : { stack: error.stack }) };
  }
  return { code: fallbackCode, message: String(error) };
}

function safeLog(logger, level, event, fields) {
  try {
    logger[level](event, fields);
  } catch {
    // Logging is best-effort by design: a broken log sink must not stop interventions,
    // and there is no other channel left to report its failure on.
  }
}
