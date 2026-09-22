import { validatePluginParams } from "./pluginParams.js";
import { err, ok } from "./result.js";

export const MAX_OUTCOMES = 20;
export const PROBABILITY_SUM_TOLERANCE = 1e-9;
const OUTCOME_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const OUTCOME_KEYS = new Set(["id", "probability", "action"]);

/**
 * @param {unknown} outcomes
 * @param {import("./pluginParams.js").ValidationContext} context
 * @returns {import("./result.js").Result<void>}
 */
export function validateOutcomes(outcomes, context) {
  if (!Array.isArray(outcomes) || outcomes.length === 0 || outcomes.length > MAX_OUTCOMES) {
    return invalid(`outcomes must be an array of 1-${MAX_OUTCOMES} entries`);
  }
  for (const [index, outcome] of outcomes.entries()) {
    const outcomeResult = validateOutcome(outcome, index);
    if (!outcomeResult.ok) return outcomeResult;
  }
  if (new Set(outcomes.map((outcome) => outcome.id)).size !== outcomes.length) {
    return invalid("outcome ids must be unique");
  }
  const total = outcomes.reduce((sum, outcome) => sum + outcome.probability, 0);
  if (Math.abs(total - 1) > PROBABILITY_SUM_TOLERANCE) {
    return invalid(`outcome probabilities must sum to 1 (got ${total})`);
  }
  return validateActions(outcomes, context);
}

function validateOutcome(outcome, index) {
  if (typeof outcome !== "object" || outcome === null || Array.isArray(outcome)) {
    return invalid(`outcomes[${index}] must be an object`);
  }
  const unknownKey = Object.keys(outcome).find((key) => !OUTCOME_KEYS.has(key));
  if (unknownKey !== undefined) return invalid(`outcomes[${index}] has unknown field "${unknownKey}"`);
  if (typeof outcome.id !== "string" || !OUTCOME_ID_PATTERN.test(outcome.id)) {
    return invalid(`outcomes[${index}].id must match ${OUTCOME_ID_PATTERN}`);
  }
  const { probability } = outcome;
  if (typeof probability !== "number" || !(probability >= 0 && probability <= 1)) {
    return invalid(`outcomes[${index}].probability must be a number in [0, 1]`);
  }
  if (!Object.hasOwn(outcome, "action")) {
    return invalid(`outcomes[${index}].action is required (use null for no intervention)`);
  }
  const { action } = outcome;
  if (action !== null && (typeof action !== "object" || Array.isArray(action) || typeof action.type !== "string")) {
    return invalid(`outcomes[${index}].action must be null or an object with a string type`);
  }
  return ok(undefined);
}

function validateActions(outcomes, context) {
  for (const [index, outcome] of outcomes.entries()) {
    if (outcome.action === null) continue;
    const pluginResult = validatePluginParams(context.actionTypes, outcome.action, `outcomes[${index}].action`);
    if (!pluginResult.ok) return pluginResult;
  }
  return ok(undefined);
}

function invalid(message) {
  return err("invalid-outcomes", message);
}
