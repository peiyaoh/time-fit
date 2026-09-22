/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: ContractError }} Result
 */

/**
 * @typedef {object} ContractError
 * @property {string} code     Stable kebab-case code; part of the public API.
 * @property {string} message
 * @property {object} [details]
 */

/**
 * @template T
 * @param {T} value
 * @returns {Result<T>}
 */
export function ok(value) {
  return Object.freeze({ ok: true, value });
}

/**
 * @param {string} code
 * @param {string} message
 * @param {object} [details]
 * @returns {Result<never>}
 */
export function err(code, message, details) {
  const error = details === undefined ? { code, message } : { code, message, details };
  return Object.freeze({ ok: false, error: Object.freeze(error) });
}
