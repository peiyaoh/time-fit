import { evaluateEligibility, readOwnPath, validateEligibility } from "../src/eligibility.js";

const scheduledAt = new Date("2026-09-22T09:00:00.000Z");
const participant = { id: "alice", timeZone: "UTC", groupMembership: { arm: "A" }, phase: "intervention" };
const task = (overrides = {}) => ({ enabled: true, scope: "participant", ...overrides });
const verdict = (overrides, who = participant) => evaluateEligibility({ task: task(overrides), participant: who, scheduledAt });

describe("evaluateEligibility (ADR 0001 §3)", () => {
  test("no filter means eligible", () => {
    expect(verdict({})).toEqual({ eligible: true });
  });

  test.each([
    [{ enabled: false }, "task-disabled"],
    [{ activeFrom: "2026-09-22T09:00:00.001Z" }, "before-active-from"],
    [{ activeUntil: "2026-09-22T09:00:00.000Z" }, "at-or-after-active-until"],
    [{ eligibility: { participantIds: ["bob"] } }, "not-in-participant-ids"],
    [{ eligibility: { attributes: { mode: "all", match: { phase: ["intervention"], "groupMembership.arm": ["B"] } } } }, "attributes-not-matched"],
  ])("%j -> %s", (overrides, reason) => {
    expect(verdict(overrides)).toEqual({ eligible: false, reason });
  });

  test("active range boundaries: activeFrom inclusive, activeUntil exclusive", () => {
    expect(verdict({ activeFrom: "2026-09-22T09:00:00.000Z", activeUntil: "2026-09-22T09:00:00.001Z" })).toEqual({ eligible: true });
  });

  test('"any" mode needs one matching path; "all" needs every path', () => {
    const match = { phase: ["baseline"], "groupMembership.arm": ["A"] };
    expect(verdict({ eligibility: { attributes: { mode: "any", match } } })).toEqual({ eligible: true });
    expect(verdict({ eligibility: { attributes: { mode: "all", match } } }).eligible).toBe(false);
  });

  test("listed participant with matching attributes is eligible", () => {
    const eligibility = { participantIds: ["alice"], attributes: { mode: "all", match: { phase: ["intervention"] } } };
    expect(verdict({ eligibility })).toEqual({ eligible: true });
  });

  test("system scope ignores participant filters", () => {
    expect(verdict({ scope: "system", eligibility: { participantIds: ["bob"] } }, null)).toEqual({ eligible: true });
  });

  test("null is a matchable value; a missing path is not null", () => {
    const match = { "groupMembership.cohort": [null] };
    expect(verdict({ eligibility: { attributes: { mode: "all", match } } }).eligible).toBe(false);
    const withNull = { ...participant, groupMembership: { cohort: null } };
    expect(verdict({ eligibility: { attributes: { mode: "all", match } } }, withNull)).toEqual({ eligible: true });
  });
});

describe("evaluateEligibility guards", () => {
  test.each([
    ["missing task", { task: null, participant, scheduledAt }],
    ["invalid date", { task: task(), participant, scheduledAt: new Date("nope") }],
    ["string date", { task: task(), participant, scheduledAt: "2026-09-22T09:00:00.000Z" }],
    ["participant task without participant", { task: task(), participant: null, scheduledAt }],
    ["participant without id", { task: task(), participant: { timeZone: "UTC" }, scheduledAt }],
  ])("rejects %s", (_label, input) => {
    expect(() => evaluateEligibility(input)).toThrow(TypeError);
  });
});

describe("readOwnPath", () => {
  test("reads own nested properties and never the prototype chain", () => {
    expect(readOwnPath(participant, "groupMembership.arm")).toBe("A");
    expect(readOwnPath(participant, "groupMembership.missing")).toBeUndefined();
    expect(readOwnPath(participant, "id.length")).toBeUndefined();
    expect(readOwnPath({}, "toString")).toBeUndefined();
  });
});

describe("validateEligibility", () => {
  const match = { phase: ["intervention"] };
  test.each([
    ["not an object", []],
    ["unknown key", { groups: {} }],
    ["empty participantIds", { participantIds: [] }],
    ["too many participantIds", { participantIds: Array.from({ length: 10_001 }, (_, i) => `p${i}`) }],
    ["blank participant id", { participantIds: [""] }],
    ["attributes not an object", { attributes: [] }],
    ["unknown attributes key", { attributes: { mode: "all", match, extra: 1 } }],
    ["bad mode", { attributes: { mode: "some", match } }],
    ["match not an object", { attributes: { mode: "all", match: null } }],
    ["empty match", { attributes: { mode: "all", match: {} } }],
    ["too many paths", { attributes: { mode: "all", match: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, [1]])) } }],
    ["bad path", { attributes: { mode: "all", match: { "a..b": [1] } } }],
    ["prototype path", { attributes: { mode: "all", match: { "a.__proto__": [1] } } }],
    ["empty allowed values", { attributes: { mode: "all", match: { phase: [] } } }],
    ["non-primitive allowed value", { attributes: { mode: "all", match: { phase: [{}] } } }],
    ["non-finite number", { attributes: { mode: "all", match: { score: [Infinity] } } }],
  ])("rejects %s", (_label, eligibility) => {
    const result = validateEligibility(eligibility);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("invalid-eligibility");
  });

  test("accepts ids, attributes, and every primitive kind", () => {
    const eligibility = { participantIds: ["alice"], attributes: { mode: "any", match: { a: ["x", 1, true, null] } } };
    expect(validateEligibility(eligibility).ok).toBe(true);
  });
});
