import { createTimeEngine } from "../src/index.js";
import { createMemoryStore } from "../src/memory/index.js";
import { mapWithConcurrency } from "../src/engine/pool.js";
import { NINE, alice, engineWith, participantTask, recordingAction } from "./support/engineKit.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));

/** Pages over a fixed list, so a test can place the same participant on two pages. */
function pagedParticipants(people) {
  return {
    async iterate({ cursor, limit }) {
      const offset = cursor === null ? 0 : Number(cursor);
      const items = people.slice(offset, offset + limit);
      return { items, nextCursor: offset + items.length < people.length ? String(offset + items.length) : null };
    },
  };
}

describe("at most once per decisionId within one tick (ADR 0013)", () => {
  test.each([1, 3])("a participant listed twice on one page executes once at concurrency %i", async (concurrency) => {
    const { engine, calls, store } = engineWith({ participants: [alice, alice], options: { concurrency } });
    const { counts } = await engine.tick(NINE);
    expect(calls).toHaveLength(1);
    expect(store.decisionLog.records()).toHaveLength(1);
    expect(counts).toMatchObject({ completed: 1, skippedClaimed: 1 });
  });

  test.each([1, 3])("a participant repeated on a later page executes once at concurrency %i", async (concurrency) => {
    const bob = { id: "bob", timeZone: "UTC" };
    const calls = [];
    const store = createMemoryStore({ tasks: [participantTask()] });
    const engine = createTimeEngine({ storage: store, participants: pagedParticipants([alice, bob, alice]), actions: [recordingAction(calls)], options: { concurrency, pageSize: 1 } });
    await engine.tick(NINE);
    expect(calls.map(({ ctx }) => ctx.participant.id).sort()).toEqual(["alice", "bob"]);
    expect(store.decisionLog.records()).toHaveLength(2);
  });

  test("each claim call gets a fresh token, and the record keeps the tick id", async () => {
    const tokens = [];
    const { decisionLog, participants } = createMemoryStore({ participants: [alice, alice] });
    const spyLog = { ...decisionLog, claim: (record, options) => { tokens.push(options.token); return decisionLog.claim(record, options); } };
    const engine = createTimeEngine({ participants, decisionLog: spyLog, tasks: [{ id: "t", scope: "participant", checkpoints: [{ id: "c", time: "09:00" }], outcomes: [{ id: "o", probability: 1, action: null }] }] });
    const summary = await engine.tick(NINE);
    expect(tokens).toHaveLength(2);
    expect(new Set(tokens).size).toBe(2);
    expect(tokens).not.toContain(summary.tickId);
    expect(decisionLog.records()[0].tickId).toBe(summary.tickId);
  });
});

describe("mapWithConcurrency failure drains started work", () => {
  function heldMapper() {
    const started = [];
    const releases = new Map();
    const mapItem = (item) => {
      started.push(item);
      return new Promise((resolve, reject) => releases.set(item, { resolve, reject }));
    };
    return { started, releases, mapItem };
  }

  test("no new item starts after a rejection, and the call settles only when started items settle", async () => {
    const { started, releases, mapItem } = heldMapper();
    let settled = false;
    const mapped = mapWithConcurrency(["a", "b", "c", "d"], 2, mapItem).catch((error) => { settled = true; return error; });
    await flush();
    expect(started).toEqual(["a", "b"]);
    const failure = new Error("a failed");
    releases.get("a").reject(failure);
    await flush();
    expect(started).toEqual(["a", "b"]);
    expect(settled).toBe(false);
    releases.get("b").resolve("b done");
    expect(await mapped).toBe(failure);
    expect(started).toEqual(["a", "b"]);
  });

  test.each([undefined, null, false])("a rejection with %p is still a failure and is rethrown as is", async (reason) => {
    let rejection = "not rejected";
    await mapWithConcurrency([1, 2, 3], 1, async (n) => { if (n === 1) throw reason; return n; }).catch((error) => { rejection = error; });
    expect(rejection).toBe(reason);
  });

  test("the first observed rejection wins, not the first worker's", async () => {
    const { releases, mapItem } = heldMapper();
    const mapped = mapWithConcurrency(["a", "b"], 2, mapItem);
    await flush();
    releases.get("b").reject(new Error("b first"));
    await flush();
    releases.get("a").reject(new Error("a second"));
    await expect(mapped).rejects.toThrow("b first");
  });
});

describe("a failing decision keeps the tick in flight until siblings finish", () => {
  test("stop and the next tick wait for started actions; no further participant starts", async () => {
    const people = ["a", "b", "c", "d"].map((id) => ({ id, timeZone: "UTC" }));
    const store = createMemoryStore({ participants: people });
    const releases = [];
    const startedFor = [];
    let active = 0;
    let maxActive = 0;
    const hold = {
      type: "hold",
      execute: async (_params, ctx) => {
        startedFor.push(ctx.participant.id);
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => releases.push(resolve));
        active -= 1;
        return { ok: true };
      },
    };
    let draws = 0;
    // The second randomization draw is invalid, so participant "b" throws inside its worker.
    const random = () => (++draws === 2 ? 2 : 0);
    const task = { id: "t", scope: "participant", checkpoints: [{ id: "c", time: "09:00" }], outcomes: [{ id: "send", probability: 0.5, action: { type: "hold" } }, { id: "control", probability: 0.5, action: null }] };
    const engine = createTimeEngine({ storage: store, tasks: [task], actions: [hold], random, options: { concurrency: 2 } });

    let tickSettled = false;
    const failing = engine.tick(NINE).catch((error) => { tickSettled = true; return error; });
    await flush();
    expect(startedFor).toEqual(["a"]);
    let stopSettled = false;
    const stopped = engine.stop().then(() => { stopSettled = true; });
    await flush();
    expect(tickSettled).toBe(false);
    expect(stopSettled).toBe(false);
    expect(await engine.tick(new Date("2026-09-22T09:01:00.000Z"))).toEqual({ skipped: "in-flight" });

    releases.splice(0).forEach((release) => release());
    expect(await failing).toBeInstanceOf(TypeError);
    await stopped;
    expect(startedFor).toEqual(["a"]);
    expect(maxActive).toBe(1);
    expect(store.decisionLog.records().map(({ participantId, state }) => [participantId, state])).toEqual([["a", "completed"]]);
  });
});

describe("tasks port receives the evaluated window (ADR 0013)", () => {
  test("listActive gets the tick instant and a detached windowFrom equal to the window start", async () => {
    const calls = [];
    const { decisionLog, participants } = createMemoryStore({ participants: [alice] });
    const tasks = { listActive: async (at, options) => { calls.push({ at, options }); return []; } };
    const engine = createTimeEngine({ participants, decisionLog, tasks, options: { catchUpWindowMinutes: 5 } });
    const first = await engine.tick(NINE);
    await engine.tick(new Date("2026-09-22T09:01:00.000Z"));
    expect(calls[0].at).toEqual(NINE);
    expect(calls[0].options.windowFrom).toEqual(new Date(first.window.from));
    expect(calls[0].options.windowFrom).toEqual(new Date("2026-09-22T08:55:00.000Z"));
    expect(calls[1].options.windowFrom).toEqual(NINE);
    calls[0].options.windowFrom.setTime(0);
    expect(first.window.from).toBe("2026-09-22T08:55:00.000Z");
  });
});

describe("participant pages must make progress (ADR 0013)", () => {
  test("an empty page with a non-null cursor aborts the tick on the first such response", async () => {
    let requests = 0;
    const participants = { iterate: async () => { requests += 1; return { items: [], nextCursor: "same" }; } };
    const stalled = createTimeEngine({ storage: createMemoryStore({ tasks: [participantTask()] }), participants, actions: [recordingAction()] });
    const summary = await stalled.tick(NINE);
    expect(requests).toBe(1);
    expect(summary).toMatchObject({ completed: false, failedStage: "participants" });
  });

  test("an empty terminal page is a normal end of iteration", async () => {
    const participants = { iterate: async () => ({ items: [], nextCursor: null }) };
    const engine = createTimeEngine({ storage: createMemoryStore({ tasks: [participantTask()] }), participants, actions: [recordingAction()] });
    expect(await engine.tick(NINE)).toMatchObject({ completed: true });
  });
});

describe("stored payloads are detached JSON (ADR 0013)", () => {
  test("a delivery with a function and a Date is stored as JSON and the decision completes", async () => {
    const delivery = { id: "m1", at: new Date("2026-09-22T09:00:00.000Z"), format: () => "not JSON", nested: { n: 1 } };
    const action = { type: "record", execute: async () => ({ ok: true, delivery }) };
    const { engine, store } = engineWith({ actions: [action] });
    const { counts } = await engine.tick(NINE);
    delivery.nested.n = 2;
    const [record] = store.decisionLog.records();
    expect(counts).toMatchObject({ completed: 1, finalizeFailed: 0 });
    expect(record.state).toBe("completed");
    expect(record.result.delivery).toEqual({ id: "m1", at: "2026-09-22T09:00:00.000Z", nested: { n: 1 } });
  });
});

describe("failure granularity (ADR 0013 §2)", () => {
  test("a participant already started finishes its own decisions; no new participant starts", async () => {
    const store = createMemoryStore({ participants: ["a", "b", "c"].map((id) => ({ id, timeZone: "UTC" })) });
    const calls = [];
    let release;
    const action = {
      type: "hold",
      execute: async (_params, ctx) => {
        calls.push(`${ctx.participant.id}:${ctx.taskId}`);
        if (ctx.taskId === "first") await new Promise((resolve) => { release = resolve; });
        return { ok: true };
      },
    };
    const task = (id, priority) => ({ id, scope: "participant", priority, checkpoints: [{ id: "nine", time: "09:00" }], outcomes: [{ id: "send", probability: 0.5, action: { type: "hold" } }, { id: "none", probability: 0.5, action: null }] });
    let draws = 0;
    const engine = createTimeEngine({ storage: store, tasks: [task("first", 1), task("second", 2)], actions: [action], random: () => (++draws === 2 ? 2 : 0), options: { concurrency: 2 } });
    const pending = engine.tick(NINE).catch((error) => error);
    await flush();
    expect(calls).toEqual(["a:first"]);
    release();
    expect(await pending).toBeInstanceOf(TypeError);
    expect(calls).toEqual(["a:first", "a:second"]);
  });
});
