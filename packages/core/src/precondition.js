import { validatePluginParams } from "./pluginParams.js";
import { err, ok } from "./result.js";

/**
 * @typedef {{ all: PreconditionNode[] } | { any: PreconditionNode[] } | { not: PreconditionNode }
 *   | { condition: { type: string } & Record<string, unknown> }} PreconditionNode  (ADR 0006)
 */

/**
 * @typedef {{ ok: true, met: boolean, evidence?: object } | { ok: false, error: { code: string, message: string } }} ConditionResult
 */

/**
 * @typedef {object} ConditionEvaluationRecord
 * @property {string} path        position in the tree, e.g. "all.1.not"
 * @property {string} type
 * @property {boolean} ok
 * @property {boolean} [met]
 * @property {object} [evidence]
 * @property {{ code: string, message: string }} [error]
 */

/**
 * @typedef {object} PreconditionEvaluation
 * @property {"met" | "not-met" | "error"} state
 * @property {ReadonlyArray<ConditionEvaluationRecord>} conditions  in evaluation order
 */

export const MAX_PRECONDITION_DEPTH = 8;
export const MAX_PRECONDITION_NODES = 100;
const OPERATOR_KEYS = Object.freeze(["all", "any", "not", "condition"]);
const ROOT_PATH = "root";

/**
 * @param {unknown} node
 * @param {import("./pluginParams.js").ValidationContext} context
 * @returns {import("./result.js").Result<void>}
 */
export function validatePrecondition(node, context) {
  const shapeResult = validateNodeShape(node, 1, { count: 0 });
  if (!shapeResult.ok) return shapeResult;
  return validateConditionPlugins(node, context);
}

/**
 * Evaluates the tree left to right with short-circuiting. An errored condition makes the
 * whole precondition "error" regardless of surrounding operators (ADR 0006 semantics).
 * @param {PreconditionNode | undefined} node
 * @param {(condition: object, path: string) => Promise<ConditionResult>} evaluateCondition
 *   injected by the engine; wraps the plugin with timeout and error containment
 * @returns {Promise<Readonly<PreconditionEvaluation>>}
 */
export async function evaluatePrecondition(node, evaluateCondition) {
  if (typeof evaluateCondition !== "function") {
    throw new TypeError("evaluatePrecondition: evaluateCondition must be a function");
  }
  if (node === undefined) return Object.freeze({ state: "met", conditions: Object.freeze([]) });
  const evaluation = await evaluateNode(node, "", evaluateCondition);
  return Object.freeze({ state: evaluation.state, conditions: Object.freeze(evaluation.conditions) });
}

// Shape and limits only; the counter object is local to one validation call.
function validateNodeShape(node, depth, counter) {
  counter.count += 1;
  if (depth > MAX_PRECONDITION_DEPTH) return invalid(`precondition deeper than ${MAX_PRECONDITION_DEPTH}`);
  if (counter.count > MAX_PRECONDITION_NODES) return invalid(`precondition has more than ${MAX_PRECONDITION_NODES} nodes`);
  const operator = singleOperator(node);
  if (operator === undefined) return invalid("each precondition node must have exactly one of all, any, not, condition");
  if (operator === "condition") return validateConditionShape(node.condition);
  if (operator === "not") return validateNodeShape(node.not, depth + 1, counter);
  return validateChildrenShape(node[operator], operator, depth, counter);
}

function validateChildrenShape(children, operator, depth, counter) {
  if (!Array.isArray(children) || children.length === 0) return invalid(`"${operator}" must be a non-empty array`);
  for (const child of children) {
    const childResult = validateNodeShape(child, depth + 1, counter);
    if (!childResult.ok) return childResult;
  }
  return ok(undefined);
}

function validateConditionShape(condition) {
  if (!isPlainRecord(condition) || typeof condition.type !== "string") {
    return invalid("condition must be an object with a string type");
  }
  return ok(undefined);
}

function validateConditionPlugins(node, context) {
  for (const { condition, path } of conditionLeaves(node, "")) {
    const pluginResult = validatePluginParams(context.conditionTypes, condition, `precondition.${path}`);
    if (!pluginResult.ok) return pluginResult;
  }
  return ok(undefined);
}

function conditionLeaves(node, path) {
  const operator = singleOperator(node);
  if (operator === "condition") return [{ condition: node.condition, path: path || ROOT_PATH }];
  if (operator === "not") return conditionLeaves(node.not, joinPath(path, "not"));
  return node[operator].flatMap((child, index) => conditionLeaves(child, joinPath(path, `${operator}.${index}`)));
}

async function evaluateNode(node, path, evaluateCondition) {
  const operator = singleOperator(node);
  if (operator === "condition") return evaluateLeaf(node.condition, path || ROOT_PATH, evaluateCondition);
  if (operator === "not") {
    const inner = await evaluateNode(node.not, joinPath(path, "not"), evaluateCondition);
    return { state: invertState(inner.state), conditions: inner.conditions };
  }
  return evaluateChildren(node[operator], operator, path, evaluateCondition);
}

// "all" stops at the first not-met child; "any" at the first met child; both stop on error.
async function evaluateChildren(children, operator, path, evaluateCondition) {
  const decisiveState = operator === "all" ? "not-met" : "met";
  const conditions = [];
  for (const [index, child] of children.entries()) {
    const childEvaluation = await evaluateNode(child, joinPath(path, `${operator}.${index}`), evaluateCondition);
    conditions.push(...childEvaluation.conditions);
    if (childEvaluation.state === "error" || childEvaluation.state === decisiveState) {
      return { state: childEvaluation.state, conditions };
    }
  }
  return { state: operator === "all" ? "met" : "not-met", conditions };
}

async function evaluateLeaf(condition, path, evaluateCondition) {
  const result = await evaluateCondition(condition, path);
  const record = conditionRecord(condition.type, path, result);
  const state = !record.ok ? "error" : record.met ? "met" : "not-met";
  return { state, conditions: [record] };
}

function conditionRecord(type, path, result) {
  if (result?.ok === true && typeof result.met === "boolean") {
    const evidence = result.evidence === undefined ? {} : { evidence: result.evidence };
    return Object.freeze({ path, type, ok: true, met: result.met, ...evidence });
  }
  if (result?.ok === false && typeof result.error?.code === "string") {
    return Object.freeze({ path, type, ok: false, error: result.error });
  }
  return Object.freeze({
    path,
    type,
    ok: false,
    error: { code: "invalid-condition-result", message: "condition returned a malformed ConditionResult" },
  });
}

function invertState(state) {
  if (state === "met") return "not-met";
  if (state === "not-met") return "met";
  return state;
}

function singleOperator(node) {
  if (!isPlainRecord(node)) return undefined;
  const keys = Object.keys(node);
  return keys.length === 1 && OPERATOR_KEYS.includes(keys[0]) ? keys[0] : undefined;
}

function joinPath(parent, segment) {
  return parent === "" ? segment : `${parent}.${segment}`;
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message) {
  return err("invalid-precondition", message);
}
