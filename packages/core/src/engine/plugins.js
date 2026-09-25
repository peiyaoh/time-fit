import { describeError } from "./logging.js";

/**
 * @typedef {object} ConditionPlugin  (ADR 0003)
 * @property {string} type
 * @property {(params: object) => import("../result.js").Result<void>} [validate]
 * @property {(params: object, ctx: PluginContext) => Promise<import("../precondition.js").ConditionResult>} evaluate
 */

/**
 * @typedef {object} ActionPlugin  (ADR 0003)
 * @property {string} type
 * @property {(params: object) => import("../result.js").Result<void>} [validate]
 * @property {(params: object, ctx: PluginContext) => Promise<ActionResult>} execute
 */

/**
 * @typedef {{ ok: true, delivery?: object } | { ok: false, error: { code: string, message: string } }} ActionResult
 */

/**
 * @typedef {object} PluginContext
 * @property {string} decisionId
 * @property {string} taskId
 * @property {string} checkpointId
 * @property {Date} scheduledAt
 * @property {string} timeZone          the zone the decision was scheduled in
 * @property {object | null} participant
 * @property {import("./logging.js").Logger} logger
 * @property {AbortSignal} signal       aborted when the plugin times out
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
    return { ok: false, error: { code: result.error.code, message: String(result.error.message ?? "") } };
  }
  return { ok: false, error: { code: "invalid-action-result", message: "action returned a malformed ActionResult" } };
}

/**
 * Keeps plugin-supplied evidence/delivery bounded in decision records (ADR 0003).
 * @param {unknown} payload
 * @returns {unknown} the payload, or a marker when it is too large or not serializable
 */
export function capPayload(payload) {
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    // Circular or BigInt payloads cannot be stored; record that fact instead of the value.
    return { unserializable: true };
  }
  const sizeBytes = Buffer.byteLength(serialized ?? "", "utf8");
  return sizeBytes > MAX_PAYLOAD_BYTES ? { truncated: true, sizeBytes } : payload;
}
