import { jest } from "@jest/globals";
import { createTimeEngine, timeWindowCondition } from "../src/index.js";
import { createMemoryStore } from "../src/memory/index.js";
import { mapWithConcurrency } from "../src/engine/pool.js";
import { tallyOutcomes } from "../src/engine/summary.js";
import { bindLogger, describeError } from "../src/engine/logging.js";
import { capPayload, invokeIsolated, normalizeActionResult } from "../src/engine/plugins.js";
import { NINE, alice, captureLogger, engineWith, participantTask, recordingAction } from "./support/engineKit.js";

const counts = async (engine, now = NINE) => (await engine.tick(now)).counts;

describe("tick failure handling", () => {
  test("tasks port failure aborts the tick without advancing the window", async () => {
    const { decisionLog, participants } = createMemoryStore({ participants: [alice] });
    let fail = true;
    const tasks = { listActive: async () => (fail ? Promise.reject(new Error("db down")) : [participantTask()]) };
    const capture = captureLogger();
    const engine = createTimeEngine({ participants, decisionLog, tasks, actions: [recordingAction()], logger: capture.logger });
    const failed = await engine.tick(NINE);
    expect(failed).toMatchObject({ completed: false, failedStage: "tasks" });
    expect(capture.names()).toContain("tick-failed");
    fail = false;
    const recovered = await engine.tick(new Date("2026-09-22T09:01:00.000Z"));
    expect(recovered.counts.completed).toBe(1);
  });

  test("tasks port returning a non-array aborts the tick", async () => {
    const { decisionLog } = createMemoryStore();
    const engine = createTimeEngine({ decisionLog, tasks: { listActive: async () => ({}) } });
    expect(await engine.tick(NINE)).toMatchObject({ completed: false, failedStage: "tasks" });
  });

  test.each([
    ["throws", async () => Promise.reject(new Error("down"))],
    ["malformed page", async () => ({ items: "nope", nextCursor: null })],
    ["bad cursor", async () => ({ items: [], nextCursor: 5 })],
    ["page larger than limit", async () => ({ items: [alice, alice], nextCursor: null })],
  ])("participants port %s aborts but keeps earlier work", async (_label, iterate) => {
    const { decisionLog } = createMemoryStore();
    const systemTask = { ...participantTask({ id: "sys", scope: "system", timeZone: "UTC" }) };
    const engine = createTimeEngine({ decisionLog, participants: { iterate }, tasks: [systemTask, participantTask()], actions: [recordingAction()], options: { pageSize: 1 } });
    const summary = await engine.tick(NINE);
    expect(summary).toMatchObject({ completed: false, failedStage: "participants" });
    expect(summary.counts.completed).toBe(1);
  });

  test("a failure after some pages keeps outcomes from finished pages", async () => {
    const { decisionLog } = createMemoryStore();
    const iterate = async ({ cursor }) => (cursor === null ? { items: [alice], nextCursor: "1" } : Promise.reject(new Error("boom")));
    const engine = createTimeEngine({ decisionLog, participants: { iterate }, tasks: [participantTask()], actions: [recordingAction()] });
    const summary = await engine.tick(NINE);
    expect(summary).toMatchObject({ completed: false, failedStage: "participants" });
    expect(summary.counts.completed).toBe(1);
  });

  test("claim failure skips execution; finalize failure is counted", async () => {
    const base = createMemoryStore().decisionLog;
    const calls = [];
    const decisionLog = { ...base, claim: async () => Promise.reject(new Error("claim down")) };
    const { participants } = createMemoryStore({ participants: [alice] });
    const engine = createTimeEngine({ decisionLog, participants, tasks: [participantTask()], actions: [recordingAction(calls)] });
    expect((await counts(engine)).claimFailed).toBe(1);
    expect(calls).toHaveLength(0);

    const finalizing = { ...base, complete: async () => Promise.reject(new Error("write down")), fail: async () => Promise.reject(new Error("write down")) };
    const second = createTimeEngine({ decisionLog: finalizing, participants, tasks: [participantTask()], actions: [recordingAction()] });
    expect(await counts(second)).toMatchObject({ completed: 1, finalizeFailed: 1 });
    const third = createTimeEngine({
      decisionLog: { ...createMemoryStore().decisionLog, fail: finalizing.fail },
      participants,
      tasks: [participantTask({ outcomes: [{ id: "x", probability: 1, action: { type: "boom" } }] })],
      actions: [{ type: "boom", execute: async () => ({ ok: false, error: { code: "provider-down", message: "503" } }) }],
    });
    expect(await counts(third)).toMatchObject({ failed: 1, finalizeFailed: 1 });
  });

  test("unavailable claim failure and duplicate unavailable claims are counted", async () => {
    const task = participantTask({ precondition: { condition: { type: "never" } } });
    const never = { type: "never", evaluate: async () => ({ ok: true, met: false }) };
    const { participants, decisionLog } = createMemoryStore({ participants: [alice] });
    const failing = { ...decisionLog, claim: async () => Promise.reject(new Error("x")) };
    const broken = createTimeEngine({ participants, decisionLog: failing, tasks: [task], conditions: [never], actions: [recordingAction()] });
    expect(await counts(broken)).toMatchObject({ unavailable: 1, claimFailed: 1 });
    const first = createTimeEngine({ participants, decisionLog, tasks: [task], conditions: [never], actions: [recordingAction()] });
    const second = createTimeEngine({ participants, decisionLog, tasks: [task], conditions: [never], actions: [recordingAction()] });
    expect(await counts(first)).toMatchObject({ unavailableRecorded: 1 });
    expect(await counts(second)).toMatchObject({ skippedClaimed: 1 });
  });

  test("recordGap failure is logged and the tick continues", async () => {
    const { participants, decisionLog } = createMemoryStore({ participants: [alice] });
    const capture = captureLogger();
    const log = { ...decisionLog, recordGap: async () => Promise.reject(new Error("x")) };
    const engine = createTimeEngine({ participants, decisionLog: log, tasks: [participantTask()], actions: [recordingAction()], logger: capture.logger });
    await engine.tick(new Date("2026-09-22T08:00:00.000Z"));
    expect((await engine.tick(NINE)).completed).toBe(true);
    expect(capture.names()).toContain("decision-log-record-gap-failed");
  });

  test("a gap without recordGap is only logged", async () => {
    const { participants, decisionLog } = createMemoryStore({ participants: [alice] });
    const { recordGap, ...withoutGap } = decisionLog;
    expect(typeof recordGap).toBe("function");
    const capture = captureLogger();
    const engine = createTimeEngine({ participants, decisionLog: withoutGap, tasks: [participantTask()], actions: [recordingAction()], logger: capture.logger });
    await engine.tick(new Date("2026-09-22T08:00:00.000Z"));
    await engine.tick(NINE);
    expect(capture.names()).toContain("scheduler-missed-window");
  });

  test("a clock that does not advance produces an empty, incomplete tick", async () => {
    const { engine, names } = engineWith();
    await engine.tick(NINE);
    expect(await engine.tick(NINE)).toMatchObject({ completed: false, window: null });
    expect(names()).toContain("tick-clock-not-advanced");
  });

  test("a bug inside tick rejects to the caller", async () => {
    const { participants } = createMemoryStore({ participants: [alice] });
    const decisionLog = { claim: async () => ({ claimed: true }), complete: async () => ({ applied: true }), fail: async () => ({ applied: true }) };
    const engine = createTimeEngine({ participants, decisionLog, tasks: [participantTask()], actions: [recordingAction()], random: () => 2 });
    const twoArms = createTimeEngine({ participants, decisionLog, actions: [recordingAction()], random: () => 2, tasks: [participantTask({ outcomes: [{ id: "a", probability: 0.5, action: null }, { id: "b", probability: 0.5, action: null }] })] });
    expect((await engine.tick(NINE)).completed).toBe(true);
    await expect(twoArms.tick(NINE)).rejects.toThrow(TypeError);
  });

  test("tick validates its argument and defaults to the clock", async () => {
    const { engine } = engineWith({ clock: { now: () => NINE } });
    await expect(engine.tick(new Date("nope"))).rejects.toThrow(TypeError);
    expect((await engine.tick()).now).toBe(NINE.toISOString());
  });
});

describe("dynamic tasks", () => {
  test("invalid, over-cap, and participant tasks without a participants port are rejected individually", async () => {
    const { decisionLog } = createMemoryStore();
    const capture = captureLogger();
    const specs = [
      participantTask({ id: "sys", scope: "system", timeZone: "UTC" }),
      participantTask({ id: "needs-people" }),
      { id: "broken" },
      participantTask({ id: "over-cap", scope: "system", timeZone: "UTC" }),
    ];
    const engine = createTimeEngine({ decisionLog, tasks: { listActive: async () => specs }, actions: [recordingAction()], logger: capture.logger, options: { maxTasks: 3 } });
    const summary = await engine.tick(NINE);
    expect(summary.counts).toMatchObject({ taskRejected: 2, completed: 1 });
    expect(capture.names()).toEqual(expect.arrayContaining(["tasks-cap-reached", "task-invalid"]));
  });
});

describe("task ordering", () => {
  test("equal priorities run in id order", async () => {
    const calls = [];
    const system = (id) => participantTask({ id, scope: "system", timeZone: "UTC" });
    const { engine } = engineWith({ tasks: [system("zeta"), system("alpha"), system("mid")], actions: [recordingAction(calls)] });
    await engine.tick(NINE);
    expect(calls.map((call) => call.ctx.taskId)).toEqual(["alpha", "mid", "zeta"]);
  });

  test("the default clock is the system clock", async () => {
    const { engine } = engineWith();
    const before = Date.now();
    const summary = await engine.tick();
    expect(Date.parse(summary.now)).toBeGreaterThanOrEqual(before);
  });
});

describe("participants", () => {
  test("invalid participants are skipped and counted; participants are frozen copies", async () => {
    const seen = [];
    const spy = { type: "record", execute: async (_params, ctx) => { seen.push(ctx.participant); return { ok: true }; } };
    // A custom port: the memory store itself refuses non-cloneable participants.
    const people = [{ id: "", timeZone: "UTC" }, { id: "fn", timeZone: "UTC", callback: () => 1 }, { ...alice, profile: { arm: "A" } }];
    const participants = { iterate: async () => ({ items: people, nextCursor: null }) };
    const { engine } = engineWith({ participants: [], actions: [spy] });
    const custom = createTimeEngine({ participants, decisionLog: createMemoryStore().decisionLog, tasks: [participantTask()], actions: [spy] });
    expect(engine).toBeDefined();
    expect(await counts(custom)).toMatchObject({ participantInvalid: 2, completed: 1 });
    expect(Object.isFrozen(seen[0].profile)).toBe(true);
  });

  test("the participant cap stops iteration and is logged", async () => {
    const people = ["a", "b", "c"].map((id) => ({ id, timeZone: "UTC" }));
    const { engine, names } = engineWith({ participants: people, options: { maxParticipants: 2, pageSize: 1 } });
    expect((await counts(engine)).completed).toBe(2);
    expect(names()).toContain("participants-cap-reached");
  });

  test("concurrency > 1 processes every participant once", async () => {
    const people = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, timeZone: "UTC" }));
    const { engine, calls } = engineWith({ participants: people, options: { concurrency: 3, pageSize: 5 } });
    expect((await counts(engine)).completed).toBe(7);
    expect(new Set(calls.map((call) => call.ctx.participant.id)).size).toBe(7);
  });

  test("snapshot is stored, capped, and a throwing snapshot is recorded", async () => {
    const ok = engineWith({ snapshot: (participant) => ({ id: participant.id }) });
    await ok.engine.tick(NINE);
    expect(ok.store.decisionLog.records()[0].snapshot).toEqual({ id: "alice" });
    const failing = engineWith({ snapshot: () => { throw new Error("nope"); } });
    await failing.engine.tick(NINE);
    expect(failing.store.decisionLog.records()[0].snapshot.snapshotFailed.code).toBe("snapshot-threw");
  });
});

describe("preference checkpoints", () => {
  const task = participantTask({ checkpoints: [{ id: "wake", preference: "wakeupTime", offsetMinutes: 15 }] });
  test("resolved times schedule decisions; failures are counted, not fatal", async () => {
    const requests = [];
    const resolver = async (participant, request, localDate) => {
      requests.push({ participantId: participant.id, request, localDate });
      if (participant.id === "bad") return { ok: false, error: { code: "no-wake-time", message: "unset" } };
      if (participant.id === "junk") return { ok: true, value: "7am" };
      if (participant.id === "boom") throw new Error("resolver crashed");
      return { ok: true, value: "08:45" };
    };
    const people = ["alice", "bad", "junk", "boom"].map((id) => ({ id, timeZone: "UTC" }));
    const { engine, store } = engineWith({ participants: people, tasks: [task], preferenceResolver: resolver });
    const summary = await engine.tick(NINE);
    expect(summary.counts).toMatchObject({ completed: 1, preferenceUnresolved: 3 });
    expect(store.decisionLog.records()[0]).toMatchObject({ participantId: "alice", scheduledAt: NINE.toISOString() });
    expect(requests[0]).toEqual({ participantId: "alice", request: { taskId: "walk-prompt", checkpointId: "wake", preference: "wakeupTime" }, localDate: "2026-09-22" });
  });
});

describe("plugins", () => {
  test("condition evidence and action delivery are passed and capped; context is complete", async () => {
    const contexts = [];
    const big = "x".repeat(9000);
    const condition = { type: "big", evaluate: async (_p, ctx) => { contexts.push(ctx); return { ok: true, met: true, evidence: { big } }; } };
    const action = { type: "record", execute: async () => ({ ok: true, delivery: { big } }) };
    const task = participantTask({ precondition: { condition: { type: "big", threshold: 3 } } });
    const { engine, store } = engineWith({ tasks: [task], conditions: [condition], actions: [action] });
    await engine.tick(NINE);
    const [record] = store.decisionLog.records();
    expect(record.availability.conditions[0].evidence).toEqual({ truncated: true, sizeBytes: 9010 });
    expect(record.result.delivery).toEqual({ truncated: true, sizeBytes: 9010 });
    expect(Object.keys(contexts[0]).sort()).toEqual(["checkpointId", "decisionId", "logger", "participant", "scheduledAt", "signal", "taskId", "timeZone"]);
    expect(contexts[0].timeZone).toBe("UTC");
  });

  test("a hanging action times out, is aborted, and records failed", async () => {
    let aborted = false;
    const hang = { type: "record", execute: (_p, ctx) => new Promise(() => ctx.signal.addEventListener("abort", () => { aborted = true; })) };
    const { engine, store } = engineWith({ actions: [hang], options: { pluginTimeoutMs: 20 } });
    await engine.tick(NINE);
    expect(store.decisionLog.records()[0]).toMatchObject({ state: "failed", error: { code: "plugin-timeout" } });
    expect(aborted).toBe(true);
  });

  test("malformed action results fail the decision", async () => {
    const weird = { type: "record", execute: async () => "sent!" };
    const { engine, store } = engineWith({ actions: [weird] });
    await engine.tick(NINE);
    expect(store.decisionLog.records()[0].error.code).toBe("invalid-action-result");
  });

  test("helpers: normalizeActionResult, capPayload, invokeIsolated", async () => {
    expect(normalizeActionResult({ ok: true })).toEqual({ ok: true });
    expect(normalizeActionResult({ ok: false, error: { code: "c" } })).toEqual({ ok: false, error: { code: "c", message: "" } });
    const circular = {};
    circular.self = circular;
    expect(capPayload(circular)).toEqual({ unserializable: true });
    expect(capPayload(undefined)).toBeUndefined();
    expect(await invokeIsolated(() => { throw "plain"; }, 50)).toEqual({ ok: false, error: { code: "plugin-threw", message: "plain" } });
  });
});

describe("time-window condition", () => {
  const evaluate = (params, participant = { id: "a", timeZone: "UTC", activateAt: "2026-09-15T13:00:00.000Z" }) =>
    timeWindowCondition.evaluate(params, { scheduledAt: NINE, timeZone: "America/Detroit", participant });

  test("day 7 to day 14 after activation, in the decision's zone", async () => {
    const params = { start: { reference: "activateAt", startOf: "day", offset: { days: 7 } }, end: { reference: "activateAt", startOf: "day", offset: { days: 14 } } };
    const result = await evaluate(params);
    expect(result).toMatchObject({ ok: true, met: true, evidence: { start: "2026-09-22T04:00:00.000Z", end: "2026-09-29T04:00:00.000Z" } });
    expect((await evaluate(params, { id: "a", timeZone: "UTC", activateAt: new Date("2026-09-01T00:00:00Z") })).met).toBe(false);
  });

  test("inclusive end by default, exclusive when asked", async () => {
    const endAtNow = { start: { reference: "scheduledAt", offset: { hours: -1 } }, end: { reference: "scheduledAt" } };
    expect((await evaluate(endAtNow)).met).toBe(true);
    expect((await evaluate({ ...endAtNow, inclusive: false })).met).toBe(false);
  });

  test("a missing or invalid reference is a condition error", async () => {
    const params = { start: { reference: "activateAt" }, end: { reference: "scheduledAt" } };
    expect((await evaluate(params, { id: "a", timeZone: "UTC" })).error.code).toBe("time-window-reference-missing");
    expect((await evaluate(params, { id: "a", timeZone: "UTC", activateAt: 5 })).ok).toBe(false);
    expect((await evaluate(params, { id: "a", timeZone: "UTC", activateAt: "not a date" })).ok).toBe(false);
  });

  test.each([
    [{ start: { reference: "scheduledAt" }, end: { reference: "scheduledAt" }, extra: 1 }],
    [{ start: { reference: "scheduledAt" }, end: { reference: "scheduledAt" }, inclusive: "yes" }],
    [{ start: null, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", when: 1 }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "a..b" }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", startOf: "year" }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", offset: [] }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", offset: {} }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", offset: { weeks: 1 } }, end: { reference: "scheduledAt" } }],
    [{ start: { reference: "scheduledAt", offset: { days: 1.5 } }, end: { reference: "scheduledAt" } }],
  ])("validate rejects %j", (params) => {
    expect(timeWindowCondition.validate(params).ok).toBe(false);
  });

  test("validate accepts a full definition", () => {
    const params = { start: { reference: "profile.activateAt", startOf: "week", offset: { days: 1, hours: 2 } }, end: { reference: "scheduledAt" }, inclusive: true };
    expect(timeWindowCondition.validate(params).ok).toBe(true);
  });
});

describe("start / stop", () => {
  afterEach(() => jest.useRealTimers());

  test("start ticks at each minute boundary until stopped", async () => {
    jest.useFakeTimers({ now: new Date("2026-09-22T08:59:30.000Z") });
    const { engine, calls } = engineWith({ clock: { now: () => new Date() } });
    engine.start();
    engine.start();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(calls).toHaveLength(1);
    await engine.stop();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(calls).toHaveLength(1);
  });

  test("a crashing tick is logged and the loop continues", async () => {
    jest.useFakeTimers({ now: new Date("2026-09-22T08:59:59.000Z") });
    const { participants } = createMemoryStore({ participants: [alice] });
    const capture = captureLogger();
    const decisionLog = { claim: async () => ({ claimed: true }), complete: async () => ({ applied: true }), fail: async () => ({ applied: true }) };
    const tasks = [participantTask({ outcomes: [{ id: "a", probability: 0.5, action: null }, { id: "b", probability: 0.5, action: null }] })];
    const engine = createTimeEngine({ participants, decisionLog, tasks, random: () => 5, clock: { now: () => new Date() }, logger: capture.logger });
    engine.start();
    await jest.advanceTimersByTimeAsync(61_000);
    expect(capture.names().filter((name) => name === "tick-crashed")).toHaveLength(2);
    await engine.stop();
  });

  test("stop waits for an in-flight tick", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const slow = { type: "record", execute: async () => { await gate; return { ok: true }; } };
    const { engine, store } = engineWith({ actions: [slow] });
    const pending = engine.tick(NINE);
    const stopped = engine.stop();
    release();
    await Promise.all([pending, stopped]);
    expect(store.decisionLog.records()[0].state).toBe("completed");
  });
});

describe("small engine helpers", () => {
  test("mapWithConcurrency preserves order and validates concurrency", async () => {
    expect(await mapWithConcurrency([3, 1, 2], 2, async (n) => n * 2)).toEqual([6, 2, 4]);
    expect(await mapWithConcurrency([], 4, async (n) => n)).toEqual([]);
    await expect(mapWithConcurrency([1], 0, async (n) => n)).rejects.toThrow(TypeError);
  });

  test("tallyOutcomes rejects unknown outcomes", () => {
    expect(tallyOutcomes(["completed", "completed"]).completed).toBe(2);
    expect(() => tallyOutcomes(["exploded"])).toThrow(TypeError);
  });

  test("bindLogger survives a throwing sink; describeError handles codes and non-errors", () => {
    const throwing = { debug() { throw new Error("sink down"); }, info() {}, warn() {}, error() {} };
    expect(() => bindLogger(throwing, { tickId: "t" }).debug("event")).not.toThrow();
    const coded = Object.assign(new Error("m"), { code: "E_CODE" });
    expect(describeError(coded)).toMatchObject({ code: "E_CODE", message: "m" });
    const stackless = new Error("s");
    stackless.stack = undefined;
    expect(describeError(stackless)).toEqual({ code: "unexpected-error", message: "s" });
    expect(describeError(42, "fallback")).toEqual({ code: "fallback", message: "42" });
  });
});
