import { createMemoryStore } from "../src/memory/index.js";
import { decisionLogConformanceChecks } from "../src/testing/index.js";

const record = (decisionId, scheduledAt = "2026-09-22T09:00:00.000Z", state = "claimed") => ({ decisionId, scheduledAt, state });

describe("memory decisionLog passes the adapter conformance suite", () => {
  test.each(decisionLogConformanceChecks.map((check) => [check.name, check]))("%s", async (_name, check) => {
    await check.run(() => createMemoryStore().decisionLog);
  });

  test("recordGap is optional for adapters", async () => {
    const check = decisionLogConformanceChecks.find((candidate) => candidate.name.startsWith("recordGap"));
    const { recordGap, ...withoutGap } = createMemoryStore().decisionLog;
    expect(recordGap).toBeDefined();
    await check.run(() => withoutGap);
  });

  test("the suite reports a broken adapter", async () => {
    const alwaysClaims = { claim: async () => ({ claimed: true }), complete: async () => ({ applied: true }), fail: async () => ({ applied: true }) };
    const check = decisionLogConformanceChecks.find((candidate) => candidate.name.startsWith("claim with a different token"));
    await expect(check.run(() => alwaysClaims)).rejects.toThrow();
  });
});

describe("createMemoryStore", () => {
  test("pages participants with string cursors and copies them", async () => {
    const people = [{ id: "a", timeZone: "UTC" }, { id: "b", timeZone: "UTC" }, { id: "c", timeZone: "UTC" }];
    const store = createMemoryStore({ participants: people });
    const first = await store.participants.iterate({ cursor: null, limit: 2 });
    expect(first).toEqual({ items: people.slice(0, 2), nextCursor: "2" });
    expect(await store.participants.iterate({ cursor: "2", limit: 2 })).toEqual({ items: [people[2]], nextCursor: null });
    first.items[0].id = "mutated";
    people[1].id = "mutated";
    store.participants.add({ id: "d", timeZone: "UTC" });
    const all = await store.participants.iterate({ cursor: null, limit: 10 });
    expect(all.items.map((participant) => participant.id)).toEqual(["a", "b", "c", "d"]);
  });

  test.each([["-1"], ["x"], [3]])("rejects cursor %p", async (cursor) => {
    await expect(createMemoryStore().participants.iterate({ cursor, limit: 1 })).rejects.toThrow(TypeError);
  });

  test("tasks upsert, remove, and list copies", async () => {
    const store = createMemoryStore({ tasks: [{ id: "a", v: 1 }, { id: "z", v: 1 }] });
    store.tasks.upsert({ id: "a", v: 2 });
    store.tasks.upsert({ id: "b", v: 1 });
    expect(store.tasks.list()).toEqual([{ id: "a", v: 2 }, { id: "z", v: 1 }, { id: "b", v: 1 }]);
    store.tasks.remove("a");
    store.tasks.remove("z");
    expect(store.tasks.list()).toEqual([{ id: "b", v: 1 }]);
    (await store.tasks.listActive())[0].v = 99;
    expect(store.tasks.list()[0].v).toBe(1);
  });

  test("keeps records only inside the retention window and under the cap", async () => {
    const { decisionLog } = createMemoryStore({ retentionMinutes: 60, maxRecords: 2 });
    await decisionLog.claim(record("old", "2026-09-22T07:00:00.000Z"), { token: "t" });
    await decisionLog.claim(record("a", "2026-09-22T08:30:00.000Z"), { token: "t" });
    await decisionLog.claim(record("b", "2026-09-22T09:00:00.000Z"), { token: "t" });
    expect(decisionLog.records().map((stored) => stored.decisionId)).toEqual(["a", "b"]);
    await decisionLog.claim(record("c", "2026-09-22T09:01:00.000Z"), { token: "t" });
    expect(decisionLog.records().map((stored) => stored.decisionId)).toEqual(["b", "c"]);
  });

  test("records transitions, gaps, and returns copies", async () => {
    const { decisionLog } = createMemoryStore();
    await decisionLog.claim(record("d1"), { token: "t" });
    await decisionLog.complete("d1", { finishedAt: "x", delivery: { id: 1 } });
    await decisionLog.claim(record("d2"), { token: "t" });
    await decisionLog.complete("d2", { finishedAt: "x" });
    await decisionLog.claim(record("d3"), { token: "t" });
    await decisionLog.fail("d3", { finishedAt: "x", error: { code: "e", message: "m" } });
    await decisionLog.recordGap({ from: new Date(0), to: new Date(60_000), tickId: "t" });
    expect(decisionLog.get("d1")).toMatchObject({ state: "completed", claimToken: "t", result: { delivery: { id: 1 } } });
    expect(decisionLog.get("d2").result).toEqual({ delivery: null });
    expect(decisionLog.get("d3")).toMatchObject({ state: "failed", error: { code: "e" } });
    expect(decisionLog.get("missing")).toBeUndefined();
    expect(decisionLog.gaps()).toEqual([{ from: "1970-01-01T00:00:00.000Z", to: "1970-01-01T00:01:00.000Z", tickId: "t" }]);
    decisionLog.get("d1").state = "mutated";
    expect(decisionLog.get("d1").state).toBe("completed");
  });

  test.each([
    ["missing id", [{ scheduledAt: "2026-09-22T09:00:00.000Z", state: "claimed" }, { token: "t" }]],
    ["bad state", [record("d", undefined, "completed"), { token: "t" }]],
    ["bad scheduledAt", [record("d", "nope"), { token: "t" }]],
    ["missing token", [record("d"), { token: "" }]],
  ])("claim rejects %s", async (_label, args) => {
    await expect(createMemoryStore().decisionLog.claim(...args)).rejects.toThrow(TypeError);
  });

  test.each([
    [{ participants: {} }],
    [{ tasks: null }],
    [{ retentionMinutes: 0 }],
    [{ maxRecords: 1.5 }],
  ])("rejects options %j", (options) => {
    expect(() => createMemoryStore(options)).toThrow(TypeError);
  });

  test("iterate validates limit", async () => {
    await expect(createMemoryStore().participants.iterate({ cursor: null, limit: 0 })).rejects.toThrow(TypeError);
  });
});
