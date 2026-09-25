import * as core from "../src/index.js";
import { validateOutcomes } from "../src/outcomes.js";
import { assertValidationContext, validatePluginParams } from "../src/pluginParams.js";
import { ok, err } from "../src/result.js";
import { validateTaskSet, validateTaskSpec } from "../src/taskSpec.js";
import { fixtureValidationContext } from "./support/fixtures.js";

const context = fixtureValidationContext();
const baseTask = () => ({
  id: "walk-prompt",
  scope: "participant",
  checkpoints: [{ id: "morning", time: "09:00" }],
  outcomes: [{ id: "notify", probability: 1, action: { type: "fixture-record" } }],
});
const codeOf = (spec) => validateTaskSpec(spec, context).error?.code;

describe("validateTaskSpec units", () => {
  test("normalizes with defaults, UTC instants, and deep freezing", () => {
    const spec = { ...baseTask(), activeFrom: "2026-09-22T05:00:00-04:00", eligibility: { participantIds: ["alice"] }, precondition: { condition: { type: "fixture-met" } } };
    const { value } = validateTaskSpec(spec, context);
    expect(value).toMatchObject({ enabled: true, priority: 100, logUnavailable: true, activeFrom: "2026-09-22T09:00:00.000Z" });
    expect(value.checkpoints[0]).toEqual({ id: "morning", time: "09:00", daysOfWeek: [1, 2, 3, 4, 5, 6, 7], offsetMinutes: 0 });
    expect(Object.isFrozen(value.eligibility.participantIds)).toBe(true);
    expect(Object.isFrozen(value.outcomes[0].action)).toBe(true);
    expect(value.eligibility).not.toBe(spec.eligibility);
  });

  test("keeps explicit values and system timeZone", () => {
    const spec = { ...baseTask(), scope: "system", timeZone: "America/Detroit", enabled: false, priority: -5, logUnavailable: false, activeUntil: "2026-12-31T00:00:00Z" };
    expect(validateTaskSpec(spec, context).value).toMatchObject({ enabled: false, priority: -5, logUnavailable: false, timeZone: "America/Detroit", activeUntil: "2026-12-31T00:00:00.000Z" });
  });

  test.each([
    ["non-object spec", null, "invalid-spec"],
    ["array spec", [], "invalid-spec"],
    ["non-boolean enabled", { enabled: "yes" }, "invalid-field"],
    ["non-boolean logUnavailable", { logUnavailable: 1 }, "invalid-field"],
    ["fractional priority", { priority: 1.5 }, "invalid-field"],
    ["huge priority", { priority: 2_000_000 }, "invalid-field"],
    ["activeFrom without offset", { activeFrom: "2026-09-22T09:00:00" }, "invalid-active-range"],
    ["activeFrom not a date", { activeFrom: "2026-02-30T09:00:00Z" }, "invalid-active-range"],
    ["too many checkpoints", { checkpoints: Array.from({ length: 51 }, (_, i) => ({ id: `c${i}`, time: "09:00" })) }, "invalid-checkpoint"],
    ["checkpoints not array", { checkpoints: {} }, "invalid-checkpoint"],
    ["one malformed checkpoint", { checkpoints: [{ id: "a", time: "09:00" }, { id: "b", time: "25:00" }] }, "invalid-checkpoint"],
    ["system task with eligibility", { scope: "system", timeZone: "UTC", eligibility: { participantIds: ["a"] } }, "invalid-eligibility"],
  ])("%s -> %s", (_label, overrides, code) => {
    const spec = overrides === null || Array.isArray(overrides) ? overrides : { ...baseTask(), ...overrides };
    expect(codeOf(spec)).toBe(code);
  });

  test("error details carry the task id", () => {
    expect(validateTaskSpec({ ...baseTask(), priority: 0.5 }, context).error.details).toEqual({ taskId: "walk-prompt" });
  });

  test("rejects a malformed validation context", () => {
    expect(() => validateTaskSpec(baseTask(), { conditionTypes: new Map() })).toThrow(TypeError);
    expect(() => assertValidationContext(null)).toThrow(TypeError);
  });
});

describe("validateTaskSet", () => {
  test("rejects duplicates and over-cap specs individually and versions the rest", () => {
    const specs = [baseTask(), baseTask(), { ...baseTask(), id: "other" }, { ...baseTask(), id: "bad", scope: "team" }, { ...baseTask(), id: "late" }];
    const { tasks, rejected } = validateTaskSet(specs, context, { maxTasks: 4 });
    expect(tasks.map((task) => task.spec.id)).toEqual(["walk-prompt", "other"]);
    expect(tasks[0].taskVersion).toMatch(/^[0-9a-f]{64}$/);
    expect(rejected.map(({ index, taskId, error }) => [index, taskId, error.code])).toEqual([
      [1, "walk-prompt", "duplicate-task-id"],
      [3, "bad", "invalid-scope"],
      [4, "late", "task-cap-exceeded"],
    ]);
  });

  test("uses the default cap and tolerates null entries", () => {
    const { rejected } = validateTaskSet([null], context);
    expect(rejected[0]).toMatchObject({ index: 0, taskId: undefined, error: { code: "invalid-spec" } });
  });

  test.each([
    ["non-array specs", () => validateTaskSet({}, context)],
    ["zero cap", () => validateTaskSet([], context, { maxTasks: 0 })],
  ])("rejects %s", (_label, run) => {
    expect(run).toThrow(TypeError);
  });
});

describe("outcomes and plugin params", () => {
  test.each([
    ["not an array", {}],
    ["too many", Array.from({ length: 21 }, (_, i) => ({ id: `o${i}`, probability: 1 / 21, action: null }))],
    ["non-object outcome", [null]],
    ["unknown key", [{ id: "a", probability: 1, action: null, weight: 1 }]],
    ["missing action", [{ id: "a", probability: 1 }]],
    ["array action", [{ id: "a", probability: 1, action: [] }]],
    ["action without type", [{ id: "a", probability: 1, action: {} }]],
    ["duplicate ids", [{ id: "a", probability: 0.5, action: null }, { id: "a", probability: 0.5, action: null }]],
    ["NaN probability", [{ id: "a", probability: Number.NaN, action: null }]],
  ])("rejects %s", (_label, outcomes) => {
    expect(validateOutcomes(outcomes, context).error.code).toBe("invalid-outcomes");
  });

  const registryOf = (plugin) => new Map([[plugin.type, plugin]]);
  test("plugins without validate accept any params", () => {
    expect(validatePluginParams(registryOf({ type: "plain" }), { type: "plain", x: 1 }, "here")).toEqual(ok(undefined));
  });

  test.each([
    ["throws", () => { throw new Error("bad"); }, "validate() threw: bad"],
    ["throws a non-Error", () => { throw "bad"; }, "validate() threw: bad"],
    ["returns a non-Result", () => true, "validate() must return a Result"],
    ["returns an error without message", () => ({ ok: false }), "params rejected"],
    ["returns an error", () => err("nope", "no x"), "no x"],
  ])("a validate() that %s becomes plugin-params-invalid", (_label, validate, message) => {
    const result = validatePluginParams(registryOf({ type: "p", validate }), { type: "p" }, "here");
    expect(result.error).toMatchObject({ code: "plugin-params-invalid", message, details: { location: "here", type: "p" } });
  });

  test("a non-string type is an unknown plugin type", () => {
    expect(validatePluginParams(new Map(), { type: 3 }, "here").error.code).toBe("unknown-plugin-type");
  });
});

test("public entry point exposes the kernel", () => {
  expect(Object.keys(core).sort()).toEqual([
    "DECISION_ID_VERSION", "DECISION_RECORD_SCHEMA", "EngineConfigError", "canonicalJson", "checkpointKind",
    "computeDecisionId", "computeTaskVersion", "createTimeEngine", "decisionSubject", "deriveSeed", "err", "evaluateEligibility", "evaluatePrecondition", "isValidTimeZone",
    "localDatesForWindow", "normalizeCheckpoint", "occurrences", "ok", "randomize", "readOwnPath",
    "seededRandom", "selectArm", "timeWindowCondition", "validateEligibility", "validateOutcomes", "validatePrecondition",
    "validateTaskSet", "validateTaskSpec",
  ]);
});
