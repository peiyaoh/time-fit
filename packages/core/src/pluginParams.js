import { err, ok } from "./result.js";

/**
 * @typedef {object} PluginValidator
 * @property {string} type
 * @property {(params: object) => import("./result.js").Result<void>} [validate]
 */

/**
 * @typedef {object} ValidationContext
 * @property {ReadonlyMap<string, PluginValidator>} conditionTypes
 * @property {ReadonlyMap<string, PluginValidator>} actionTypes
 * @property {boolean} hasPreferenceResolver
 */

/**
 * Splits `{ type, ...params }` and runs the registered plugin's `validate(params)`.
 * @param {ReadonlyMap<string, PluginValidator>} registry
 * @param {{ type: unknown }} typedSpec
 * @param {string} location  human-readable position for error details (e.g. "outcomes[1].action")
 * @returns {import("./result.js").Result<void>}
 */
export function validatePluginParams(registry, typedSpec, location) {
  const { type, ...params } = typedSpec;
  if (typeof type !== "string" || !registry.has(type)) {
    return err("unknown-plugin-type", `no plugin registered for type "${type}"`, { location, type });
  }
  const plugin = registry.get(type);
  if (typeof plugin.validate !== "function") return ok(undefined);
  return runPluginValidate(plugin, params, location);
}

/**
 * @param {unknown} context
 * @returns {ValidationContext}
 */
export function assertValidationContext(context) {
  const isMap = (value) => value instanceof Map;
  if (
    typeof context !== "object" ||
    context === null ||
    !isMap(context.conditionTypes) ||
    !isMap(context.actionTypes) ||
    typeof context.hasPreferenceResolver !== "boolean"
  ) {
    throw new TypeError(
      "validation context must be { conditionTypes: Map, actionTypes: Map, hasPreferenceResolver: boolean }",
    );
  }
  return context;
}

function runPluginValidate(plugin, params, location) {
  let result;
  try {
    result = plugin.validate(params);
  } catch (error) {
    // A plugin bug must surface as an invalid task, not crash validation of other tasks.
    return err("plugin-params-invalid", `validate() threw: ${error?.message ?? error}`, {
      location,
      type: plugin.type,
    });
  }
  if (!isResult(result)) {
    return err("plugin-params-invalid", "validate() must return a Result", { location, type: plugin.type });
  }
  if (!result.ok) {
    return err("plugin-params-invalid", result.error?.message ?? "params rejected", {
      location,
      type: plugin.type,
      pluginError: result.error,
    });
  }
  return ok(undefined);
}

function isResult(value) {
  return typeof value === "object" && value !== null && typeof value.ok === "boolean";
}
