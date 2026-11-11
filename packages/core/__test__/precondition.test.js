import { evaluatePrecondition, validatePrecondition } from "../src/precondition.js";
import { fixtureValidationContext } from "./support/fixtures.js";

// Resolves conditions by type: met / not-met / error, recording evaluation order.
function scriptedConditions() {
  const calls = [];
  const results = {
    "fixture-met": { ok: true, met: true, evidence: { source: "test" } },
    "fixture-not-met": { ok: true, met: false },
    "fixture-error": { ok: false, error: { code: "fixture-error", message: "boom" } },
    "fixture-malformed": { ok: "yes" },
  };
  const evaluateCondition = async (condition, path) => {
    calls.push(path);
    return results[condition.type];
  };
  return { calls, evaluateCondition };
}

const leaf = (type) => ({ condition: { type } });

describe("evaluatePrecondition", () => {
  test("absent precondition is met with no records", async () => {
    const { evaluateCondition } = scriptedConditions();
    expect(await evaluatePrecondition(undefined, evaluateCondition)).toEqual({ state: "met", conditions: [] });
  });

  test("single root condition uses path 'root' and keeps evidence", async () => {
    const { evaluateCondition } = scriptedConditions();
    const result = await evaluatePrecondition(leaf("fixture-met"), evaluateCondition);
    expect(result).toEqual({
      state: "met",
      conditions: [{ path: "root", type: "fixture-met", ok: true, met: true, evidence: { source: "test" } }],
    });
  });

  test("all short-circuits on the first not-met child", async () => {
    const { calls, evaluateCondition } = scriptedConditions();
    const node = { all: [leaf("fixture-met"), leaf("fixture-not-met"), leaf("fixture-met")] };
    expect((await evaluatePrecondition(node, evaluateCondition)).state).toBe("not-met");
    expect(calls).toEqual(["all.0", "all.1"]);
  });

  test("all of met children is met", async () => {
    const { evaluateCondition } = scriptedConditions();
    const node = { all: [leaf("fixture-met"), { not: leaf("fixture-not-met") }] };
    const result = await evaluatePrecondition(node, evaluateCondition);
    expect(result.state).toBe("met");
    expect(result.conditions.map((record) => record.path)).toEqual(["all.0", "all.1.not"]);
  });

  test("any short-circuits on the first met child; none met is not-met", async () => {
    const first = scriptedConditions();
    const anyNode = { any: [leaf("fixture-not-met"), leaf("fixture-met"), leaf("fixture-met")] };
    expect((await evaluatePrecondition(anyNode, first.evaluateCondition)).state).toBe("met");
    expect(first.calls).toEqual(["any.0", "any.1"]);
    const second = scriptedConditions();
    expect((await evaluatePrecondition({ any: [leaf("fixture-not-met")] }, second.evaluateCondition)).state).toBe("not-met");
  });

  test("an error wins over surrounding operators, including not", async () => {
    const { calls, evaluateCondition } = scriptedConditions();
    const node = { any: [{ not: leaf("fixture-error") }, leaf("fixture-met")] };
    const result = await evaluatePrecondition(node, evaluateCondition);
    expect(result.state).toBe("error");
    expect(calls).toEqual(["any.0.not"]);
    expect(result.conditions[0]).toEqual({ path: "any.0.not", type: "fixture-error", ok: false, error: { code: "fixture-error", message: "boom" } });
  });

  test("not inverts met", async () => {
    const { evaluateCondition } = scriptedConditions();
    expect((await evaluatePrecondition({ not: leaf("fixture-met") }, evaluateCondition)).state).toBe("not-met");
  });

  test("a malformed ConditionResult is recorded as an error, never as met", async () => {
    const { evaluateCondition } = scriptedConditions();
    const result = await evaluatePrecondition(leaf("fixture-malformed"), evaluateCondition);
    expect(result.state).toBe("error");
    expect(result.conditions[0].error.code).toBe("invalid-condition-result");
  });

  test("rejects a missing evaluator", async () => {
    await expect(evaluatePrecondition(leaf("fixture-met"), undefined)).rejects.toThrow(TypeError);
  });

  test("results are frozen", async () => {
    const { evaluateCondition } = scriptedConditions();
    const result = await evaluatePrecondition(leaf("fixture-met"), evaluateCondition);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.conditions)).toBe(true);
  });
});

describe("validatePrecondition", () => {
  const context = fixtureValidationContext();
  test.each([
    ["two operators", { all: [leaf("fixture-met")], any: [leaf("fixture-met")] }],
    ["unknown operator", { some: [] }],
    ["not an object", "fixture-met"],
    ["condition without type", { condition: {} }],
    ["all not an array", { all: leaf("fixture-met") }],
    ["too many nodes", { all: Array.from({ length: 100 }, () => leaf("fixture-met")) }],
    ["invalid child deep inside", { all: [leaf("fixture-met"), { any: [{ not: {} }] }] }],
  ])("rejects %s", (_label, node) => {
    const result = validatePrecondition(node, context);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("invalid-precondition");
  });

  test("reports the failing plugin location", () => {
    const result = validatePrecondition({ all: [leaf("fixture-met"), { not: leaf("nope") }] }, context);
    expect(result.error).toMatchObject({ code: "unknown-plugin-type", details: { location: "precondition.all.1.not" } });
  });

  test("accepts 100 nodes exactly and depth 8 exactly", () => {
    const hundred = { all: Array.from({ length: 99 }, () => leaf("fixture-met")) };
    expect(validatePrecondition(hundred, context).ok).toBe(true);
    const depthEight = { not: { not: { not: { not: { not: { not: { not: leaf("fixture-met") } } } } } } };
    expect(validatePrecondition(depthEight, context).ok).toBe(true);
  });
});
