import { err, ok, readOwnPath } from "@time-fit/core";

export const MAX_MESSAGE_LENGTH = 32_000;
const SAFE_DOTTED_PATH = /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * @typedef {{ ok: true, value: undefined } | { ok: false, error: { code: string, message: string, details?: object } }} ValidationResult
 * @typedef {{ ok: true, value: string } | { ok: false, error: { code: string, message: string, details?: object } }} DestinationResult
 */

/** @returns {ValidationResult} */
export function validateTextParams(params, requiredKeys) {
  if (!isPlainObject(params)) return err("invalid-action-params", "action parameters must be an object");
  const missingKey = requiredKeys.find((key) => typeof params[key] !== "string" || params[key].trim() === "");
  if (missingKey !== undefined) return err(`missing-${missingKey}`, `${missingKey} must be a non-empty string`);
  const oversizedKey = requiredKeys.find((key) => params[key].length > MAX_MESSAGE_LENGTH);
  if (oversizedKey !== undefined) return err(`invalid-${oversizedKey}`, `${oversizedKey} must be at most ${MAX_MESSAGE_LENGTH} characters`);
  return ok(undefined);
}

/** @returns {ValidationResult} */
export function validateMailjetParams(params) {
  if (!isPlainObject(params)) return err("invalid-action-params", "action parameters must be an object");
  const subjectResult = validateTextParams(params, ["subject"]);
  if (!subjectResult.ok) return subjectResult;
  const hasText = isValidOptionalText(params.text);
  const hasHtml = isValidOptionalText(params.html);
  if (isOversizedText(params.text) || isOversizedText(params.html)) return err("invalid-email-content", `email content must be at most ${MAX_MESSAGE_LENGTH} characters`);
  if (!hasText && !hasHtml) return err("missing-email-content", "text or html must be a non-empty string");
  return ok(undefined);
}

/** @returns {DestinationResult} */
export function destinationFor(participant, path, errorCode, label) {
  const value = readOwnPath(participant, path);
  if (typeof value !== "string" || value.trim() === "") return err(errorCode, `participant ${label} at "${path}" is required`);
  return ok(value.trim());
}

export function assertFactoryClient(client, methodPath, actionName) {
  const method = methodPath.reduce((current, key) => current?.[key], client);
  if (typeof method !== "function") throw new TypeError(`${actionName}: client must provide ${methodPath.join(".")}()`);
}

export function assertTextOption(value, name, actionName) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${actionName}: ${name} must be a non-empty string`);
  return value.trim();
}

export function assertSafePath(path, name, actionName) {
  if (typeof path !== "string" || !SAFE_DOTTED_PATH.test(path) || path.split(".").some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
    throw new TypeError(`${actionName}: ${name} must be a safe dotted own-property path`);
  }
  return path;
}

export const REDACTED_RECIPIENT = "[recipient]";

/**
 * Converts a provider exception into an ActionResult error. Exact occurrences of the recipient
 * are replaced, because provider messages often echo it and the message is stored in the
 * decision record. Case-changed or reformatted copies are not detected.
 * @param {string} provider
 * @param {unknown} error
 * @param {string} [recipient]  the destination the request was sent to
 */
export function providerFailure(provider, error, recipient) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = typeof recipient === "string" && recipient !== "" ? rawMessage.split(recipient).join(REDACTED_RECIPIENT) : rawMessage;
  return Object.freeze({ ok: false, error: Object.freeze({ code: `${provider}-send-failed`, message }) });
}

export function abortedResult(signal) {
  return signal?.aborted === true ? Object.freeze({ ok: false, error: Object.freeze({ code: "action-aborted", message: "action signal is already aborted" }) }) : null;
}

export function freezeAction(action) {
  return Object.freeze(action);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidOptionalText(value) {
  return typeof value === "string" && value.trim() !== "" && value.length <= MAX_MESSAGE_LENGTH;
}

function isOversizedText(value) {
  return typeof value === "string" && value.length > MAX_MESSAGE_LENGTH;
}
