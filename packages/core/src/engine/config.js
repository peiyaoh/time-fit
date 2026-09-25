import { timeWindowCondition } from "../builtins/timeWindowCondition.js";
import { seededRandom } from "../randomization.js";
import { validateTaskSet } from "../taskSpec.js";
import { EngineConfigError } from "./errors.js";
import { isLogger, noopLogger } from "./logging.js";
import { PLUGIN_TYPE_PATTERN } from "./plugins.js";

/**
 * @typedef {object} EngineOptions
 * @property {number} catchUpWindowMinutes  1-1440, default 5
 * @property {number} concurrency           1-64, default 1
 * @property {number} pageSize              1-1000, default 100
 * @property {number} maxParticipants       default 100,000
 * @property {number} maxTasks              default 500
 * @property {number} pluginTimeoutMs       1-600,000, default 30,000
 */

const BUILT_IN_CONDITIONS = Object.freeze([timeWindowCondition]);
const OPTION_RULES = Object.freeze({
  catchUpWindowMinutes: { min: 1, max: 1440, fallback: 5 },
  concurrency: { min: 1, max: 64, fallback: 1 },
  pageSize: { min: 1, max: 1000, fallback: 100 },
  maxParticipants: { min: 1, max: 10_000_000, fallback: 100_000 },
  maxTasks: { min: 1, max: 10_000, fallback: 500 },
  pluginTimeoutMs: { min: 1, max: 600_000, fallback: 30_000 },
});
const CONFIG_KEYS = new Set([
  "storage", "participants", "tasks", "decisionLog", "conditions", "actions", "preferenceResolver",
  "clock", "random", "logger", "snapshot", "studySalt", "options",
]);

/**
 * Validates `createTimeEngine` input and resolves ports, plugins, and options. Collects
 * every problem before throwing, so one error lists everything to fix.
 * @param {unknown} config
 * @returns {Readonly<object>} resolved configuration
 * @throws {EngineConfigError}
 */
export function resolveEngineConfig(config) {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new EngineConfigError([problem("config-not-object", "createTimeEngine expects a configuration object")]);
  }
  const problems = [];
  const report = (code, message, details) => problems.push(problem(code, message, details));
  Object.keys(config).filter((key) => !CONFIG_KEYS.has(key)).forEach((key) => report("unknown-config-field", `unknown field "${key}"`));
  const ports = resolvePorts(config, report);
  const registries = buildRegistries(config, report);
  const options = resolveOptions(config.options, report);
  const services = resolveServices(config, report);
  const staticTasks = registries && Array.isArray(config.tasks) ? validateStaticTasks(config, registries, options, ports, report) : null;
  if (problems.length > 0) throw new EngineConfigError(problems);
  return Object.freeze({ ...ports, ...registries, ...services, options, staticTasks });
}

function resolvePorts(config, report) {
  const storage = config.storage === undefined ? {} : config.storage;
  if (typeof storage !== "object" || storage === null) {
    report("invalid-storage", "storage must be an object");
    return resolvePorts({ ...config, storage: {} }, report);
  }
  // An explicit port (even an invalid null) overrides storage, so it gets reported below.
  const preferDirect = (direct, fromStorage) => (direct === undefined ? fromStorage : direct);
  const participants = preferDirect(config.participants, storage.participants);
  const decisionLog = preferDirect(config.decisionLog, storage.decisionLog);
  const tasks = Array.isArray(config.tasks) ? null : preferDirect(config.tasks, storage.tasks);
  if (participants !== undefined && typeof participants?.iterate !== "function") {
    report("invalid-participants-port", "participants must provide iterate({ cursor, limit })");
  }
  if (!Array.isArray(config.tasks) && typeof tasks?.listActive !== "function") {
    report("missing-tasks", "provide a static tasks array or a tasks port with listActive(at)");
  }
  const decisionLogMethods = ["claim", "complete", "fail"];
  if (!decisionLogMethods.every((method) => typeof decisionLog?.[method] === "function")) {
    report("invalid-decision-log", "decisionLog must provide claim, complete, and fail");
  }
  if (decisionLog?.recordGap !== undefined && typeof decisionLog.recordGap !== "function") {
    report("invalid-decision-log", "decisionLog.recordGap must be a function when provided");
  }
  return { participantsPort: participants === undefined ? null : participants, tasksPort: tasks ?? null, decisionLog };
}

function buildRegistries(config, report) {
  const userConditions = config.conditions === undefined ? [] : config.conditions;
  const conditionPlugins = Array.isArray(userConditions) ? [...BUILT_IN_CONDITIONS, ...userConditions] : userConditions;
  const conditionTypes = buildRegistry("condition", "evaluate", conditionPlugins, report);
  const actionTypes = buildRegistry("action", "execute", config.actions === undefined ? [] : config.actions, report);
  return conditionTypes && actionTypes ? { conditionTypes, actionTypes } : null;
}

function buildRegistry(kind, method, plugins, report) {
  if (!Array.isArray(plugins)) {
    report(`invalid-${kind}s`, `${kind}s must be an array`);
    return null;
  }
  const registry = new Map();
  for (const plugin of plugins) {
    const type = plugin?.type;
    if (typeof type !== "string" || !PLUGIN_TYPE_PATTERN.test(type) || typeof plugin[method] !== "function") {
      report(`invalid-${kind}`, `each ${kind} needs a type matching ${PLUGIN_TYPE_PATTERN} and ${method}()`, { type });
    } else if (registry.has(type)) {
      report(`duplicate-${kind}-type`, `${kind} type "${type}" is registered twice (built-ins included)`, { type });
    } else {
      registry.set(type, Object.freeze({ ...plugin }));
    }
  }
  return registry;
}

function resolveOptions(options = {}, report) {
  if (typeof options !== "object" || options === null) {
    report("invalid-options", "options must be an object");
    return defaultOptions();
  }
  Object.keys(options).filter((key) => !Object.hasOwn(OPTION_RULES, key)).forEach((key) => report("unknown-option", `unknown option "${key}"`));
  const resolved = Object.fromEntries(
    Object.entries(OPTION_RULES).map(([name, { min, max, fallback }]) => {
      const value = options[name] === undefined ? fallback : options[name];
      if (!Number.isInteger(value) || value < min || value > max) report("invalid-option", `${name} must be an integer in [${min}, ${max}]`);
      return [name, value];
    }),
  );
  return Object.freeze(resolved);
}

function defaultOptions() {
  return Object.freeze(Object.fromEntries(Object.entries(OPTION_RULES).map(([name, { fallback }]) => [name, fallback])));
}

function resolveServices(config, report) {
  const optionalFunction = (name) => {
    if (config[name] !== undefined && typeof config[name] !== "function") report(`invalid-${name}`, `${name} must be a function`);
  };
  ["preferenceResolver", "random", "snapshot"].forEach(optionalFunction);
  if (config.clock !== undefined && typeof config.clock?.now !== "function") report("invalid-clock", "clock must provide now()");
  if (config.logger !== undefined && !isLogger(config.logger)) report("invalid-logger", "logger must provide debug/info/warn/error");
  if (config.studySalt !== undefined && (typeof config.studySalt !== "string" || config.studySalt === "")) {
    report("invalid-study-salt", "studySalt must be a non-empty string");
  }
  return {
    preferenceResolver: config.preferenceResolver ?? null,
    random: config.random ?? seededRandom,
    snapshot: config.snapshot ?? null,
    clock: config.clock ?? SYSTEM_CLOCK,
    logger: config.logger ?? noopLogger,
    studySalt: config.studySalt ?? null,
  };
}

function validateStaticTasks(config, registries, options, ports, report) {
  const context = { ...registries, hasPreferenceResolver: typeof config.preferenceResolver === "function" };
  const { tasks, rejected } = validateTaskSet(config.tasks, context, { maxTasks: options.maxTasks });
  rejected.forEach(({ index, taskId, error }) => report("invalid-task", `tasks[${index}]: [${error.code}] ${error.message}`, { taskId, error }));
  if (ports.participantsPort === null && tasks.some(({ spec }) => spec.scope === "participant")) {
    report("missing-participants-port", "participant-scope tasks need a participants port");
  }
  return Object.freeze(tasks);
}

const SYSTEM_CLOCK = Object.freeze({ now: () => new Date() });

function problem(code, message, details) {
  return details === undefined ? { code, message } : { code, message, details };
}
