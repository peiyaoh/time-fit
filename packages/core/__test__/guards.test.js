import { canonicalJson } from "../src/canonicalJson.js";
import { checkpointKind, localDatesForWindow, normalizeCheckpoint, occurrences } from "../src/checkpoint.js";
import { computeDecisionId, decisionSubject } from "../src/identity.js";
import { deriveSeed, randomize, selectArm } from "../src/randomization.js";

const from = new Date("2026-09-22T09:00:00.000Z");
const to = new Date("2026-09-22T10:00:00.000Z");
const timeCheckpoint = normalizeCheckpoint({ id: "c", time: "09:30" }).value;

describe("canonicalJson", () => {
  test("serializes primitives, arrays with holes as null, and null-prototype objects", () => {
    const nullPrototype = Object.assign(Object.create(null), { b: 1, a: undefined });
    expect(canonicalJson([null, true, "x", 1.5, undefined, nullPrototype])).toBe('[null,true,"x",1.5,null,{"b":1}]');
  });

  test.each([
    ["function", () => {}],
    ["bigint", 1n],
    ["NaN", Number.NaN],
    ["Infinity", Infinity],
    ["Date", new Date(0)],
    ["class instance", new (class Point {})()],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(TypeError);
  });
});

describe("checkpoint guards", () => {
  test.each([
    ["not an object", "09:00"],
    ["array", []],
    ["no kind", { id: "c" }],
    ["unknown key", { id: "c", time: "09:00", label: "x" }],
    ["bad id", { id: "C!", time: "09:00" }],
    ["non-string cron", { id: "c", cron: 5 }],
    ["unparseable cron", { id: "c", cron: "61 * * * *" }],
    ["bad preference name", { id: "c", preference: "9am" }],
    ["null offset", { id: "c", time: "09:00", offsetMinutes: null }],
    ["null daysOfWeek", { id: "c", time: "09:00", daysOfWeek: null }],
    ["duplicate daysOfWeek", { id: "c", time: "09:00", daysOfWeek: [1, 1] }],
  ])("normalizeCheckpoint rejects %s", (_label, input) => {
    expect(normalizeCheckpoint(input).error.code).toBe("invalid-checkpoint");
  });

  test("normalization applies defaults, trims cron, and sorts days", () => {
    expect(normalizeCheckpoint({ id: "c", cron: " 0 9 * * * " }).value).toEqual({ id: "c", cron: "0 9 * * *", offsetMinutes: 0 });
    expect(normalizeCheckpoint({ id: "w", preference: "wakeupTime", daysOfWeek: [7, 1] }).value).toEqual({
      id: "w", preference: "wakeupTime", daysOfWeek: [1, 7], offsetMinutes: 0,
    });
  });

  test("checkpointKind rejects non-checkpoints", () => {
    expect(() => checkpointKind({ id: "c" })).toThrow(TypeError);
  });

  test("localDatesForWindow refuses cron checkpoints", () => {
    const cron = normalizeCheckpoint({ id: "c", cron: "0 9 * * *" }).value;
    expect(() => localDatesForWindow({ checkpoint: cron, timeZone: "UTC", from, to })).toThrow(TypeError);
  });

  test("preference dates without a resolved time have no occurrence", () => {
    const preference = normalizeCheckpoint({ id: "w", preference: "wakeupTime" }).value;
    expect(occurrences({ checkpoint: preference, timeZone: "UTC", from, to })).toEqual([]);
  });

  test("a malformed resolved time is a programming error", () => {
    const preference = normalizeCheckpoint({ id: "w", preference: "wakeupTime" }).value;
    const resolvedTimes = { "2026-09-22": "9:30" };
    expect(() => occurrences({ checkpoint: preference, timeZone: "UTC", from, to, resolvedTimes })).toThrow(TypeError);
  });

  test("an empty window has no occurrences", () => {
    expect(occurrences({ checkpoint: timeCheckpoint, timeZone: "UTC", from, to: from })).toEqual([]);
  });

  test.each([
    ["invalid zone", { timeZone: "+05:00", from, to }, TypeError],
    ["invalid date", { timeZone: "UTC", from: new Date("nope"), to }, TypeError],
    ["non-date", { timeZone: "UTC", from: "2026-09-22", to }, TypeError],
    ["inverted window", { timeZone: "UTC", from: to, to: from }, RangeError],
    ["window over 31 days", { timeZone: "UTC", from, to: new Date("2026-10-24T00:00:00.000Z") }, RangeError],
  ])("occurrences rejects %s", (_label, window, errorType) => {
    expect(() => occurrences({ checkpoint: timeCheckpoint, ...window })).toThrow(errorType);
  });
});

describe("identity guards", () => {
  test.each([
    [{ scope: "participant" }],
    [{ scope: "participant", participantId: "" }],
    [{ scope: "team", participantId: "a" }],
  ])("decisionSubject rejects %j", (input) => {
    expect(() => decisionSubject(input)).toThrow(TypeError);
  });

  const valid = { subject: "p:a", taskId: "t", checkpointId: "c", scheduledAt: from };
  test.each([
    [{ ...valid, taskId: "" }],
    [{ ...valid, subject: 1 }],
    [{ ...valid, scheduledAt: "2026-09-22T09:00:00.000Z" }],
    [{ ...valid, scheduledAt: new Date("nope") }],
  ])("computeDecisionId rejects invalid input %#", (input) => {
    expect(() => computeDecisionId(input)).toThrow(TypeError);
  });
});

describe("randomization guards", () => {
  const two = [{ id: "a", probability: 0.5 }, { id: "b", probability: 0.5 }];
  test.each([
    ["empty decisionId", () => deriveSeed("", null)],
    ["empty salt", () => deriveSeed("d", "")],
    ["non-string salt", () => deriveSeed("d", 42)],
    ["no outcomes", () => selectArm([], 0.1)],
    ["draw for single outcome", () => selectArm([{ id: "a", probability: 1 }], 0.1)],
    ["null draw for two outcomes", () => selectArm(two, null)],
    ["draw of 1", () => selectArm(two, 1)],
    ["negative draw", () => selectArm(two, -0.1)],
    ["randomize without outcomes", () => randomize({ outcomes: undefined, decisionId: "d" })],
  ])("rejects %s", (_label, run) => {
    expect(run).toThrow(TypeError);
  });

  test("injected random port and salt are used; a single outcome makes no draw", () => {
    const record = randomize({ outcomes: two, decisionId: "d", studySalt: "salt", random: () => 0.75 });
    expect(record).toMatchObject({ seedKind: "hmac", draw: 0.75, armId: "b" });
    expect(randomize({ outcomes: [{ id: "only", probability: 1 }], decisionId: "d", random: () => { throw new Error("must not draw"); } }))
      .toMatchObject({ draw: null, armId: "only" });
  });
});
