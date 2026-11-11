import { boundError } from "../boundedError.js";
import { describeError } from "./logging.js";

/**
 * @typedef {import("../contracts.js").ConditionPlugin} ConditionPlugin
 * @typedef {import("../contracts.js").ActionPlugin} ActionPlugin
 * @typedef {import("../contracts.js").ActionResult} ActionResult
 * @typedef {import("../contracts.js").PluginContext} PluginContext
 */

export const PLUGIN_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export const MAX_PAYLOAD_BYTES = 8 * 1024;
const TIMED_OUT = Symbol("timed-out");

/**
 * Runs one plugin call with a timeout and converts throws/timeouts into error results, so
 * a faulty plugin can never break the tick (ADR 0003 "Isolation").
 * @param {(signal: AbortSignal) => Promise<unknown>} invoke
 * @param {number} timeoutMs
 * @returns {Promise<unknown | { ok: false, error: object }>}
 */
export async function invokeIsolated(invoke, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
    timer.unref(); // never keep the process alive just for a plugin timeout
  });
  const race = Promise.race([Promise.resolve().then(() => invoke(controller.signal)), timeout]).finally(() => clearTimeout(timer));
  try {
    const outcome = await race;
    if (outcome !== TIMED_OUT) return outcome;
    controller.abort();
    return { ok: false, error: { code: "plugin-timeout", message: `plugin exceeded ${timeoutMs} ms` } };
  } catch (error) {
    return { ok: false, error: describeError(error, "plugin-threw") };
  }
}

/**
 * Validates an action's return value against ActionResult and caps payload size.
 * @param {unknown} result
 * @returns {ActionResult}
 */
export function normalizeActionResult(result) {
  if (result?.ok === true) {
    return result.delivery === undefined ? { ok: true } : { ok: true, delivery: capPayload(result.delivery) };
  }
  if (result?.ok === false && typeof result.error?.code === "string") {
    return { ok: false, error: boundError({ code: result.error.code, message: result.error.message }) };
  }
  return { ok: false, error: { code: "invalid-action-result", message: "action returned a malformed ActionResult" } };
}

/**
 * Keeps plugin-supplied evidence/delivery bounded in decision records (ADR 0003).
 * @param {unknown} payload
 * @returns {unknown} a detached JSON copy of the payload (exactly what was size-checked), or a
 *   marker when it is too large or not serializable
 */
export function capPayload(payload) {
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    // Circular or BigInt payloads cannot be stored; record that fact instead of the value.
    return { unserializable: true };
  }
  // undefined, functions, symbols, and toJSON() returning undefined have no JSON form.
  if (serialized === undefined) return undefined;
  const sizeBytes = Buffer.byteLength(serialized, "utf8");
  return sizeBytes > MAX_PAYLOAD_BYTES ? { truncated: true, sizeBytes } : JSON.parse(serialized);
}
