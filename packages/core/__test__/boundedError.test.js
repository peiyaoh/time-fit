import { MAX_PAYLOAD_BYTES } from "../src/engine/plugins.js";
import { MAX_ERROR_CODE_LENGTH, MAX_ERROR_MESSAGE_LENGTH, MAX_ERROR_STACK_LENGTH, TRUNCATION_MARKER, boundError, truncateText } from "../src/boundedError.js";
import { NINE, engineWith, participantTask } from "./support/engineKit.js";

const huge = "x".repeat(200_000);

describe("truncateText", () => {
  test("keeps text that fits and cuts longer text to exactly the bound, marker included", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("x".repeat(10), 10)).toBe("x".repeat(10));
    const cut = truncateText("x".repeat(11), 10);
    expect(cut).toBe(`${"x".repeat(9)}${TRUNCATION_MARKER}`);
    expect(cut).toHaveLength(10);
  });

  test("never splits a surrogate pair", () => {
    const cut = truncateText(`${"x".repeat(8)}😀😀`, 10);
    expect(cut).toBe(`${"x".repeat(8)}${TRUNCATION_MARKER}`);
    expect(cut.length).toBeLessThanOrEqual(10);
  });

  test("rejects invalid arguments", () => {
    expect(() => truncateText(1, 10)).toThrow(TypeError);
    expect(() => truncateText("x", 1)).toThrow(TypeError);
  });
});

describe("boundError", () => {
  test("bounds code, message, and stack, keeps short values exact, and drops other fields", () => {
    expect(boundError({ code: "c", message: "m", details: { x: 1 } })).toEqual({ code: "c", message: "m" });
    expect(boundError({ code: "c" })).toEqual({ code: "c", message: "" });
    const bounded = boundError({ code: "c".repeat(500), message: huge, stack: huge });
    expect(bounded.code).toHaveLength(MAX_ERROR_CODE_LENGTH);
    expect(bounded.message).toHaveLength(MAX_ERROR_MESSAGE_LENGTH);
    expect(bounded.stack).toHaveLength(MAX_ERROR_STACK_LENGTH);
    expect(bounded.message.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(() => boundError({ code: 1 })).toThrow(TypeError);
  });
});

describe("persisted error fields are bounded on every path (ADR 0013)", () => {
  test.each([
    ["returned", async () => ({ ok: false, error: { code: "provider-failed", message: huge } })],
    ["thrown", async () => { throw new Error(huge); }],
  ])("a %s oversized action error fails the decision with a bounded message", async (_label, execute) => {
    const { engine, store, events } = engineWith({ actions: [{ type: "record", execute }] });
    await engine.tick(NINE);
    const [record] = store.decisionLog.records();
    expect(record.state).toBe("failed");
    expect(record.error.message).toHaveLength(MAX_ERROR_MESSAGE_LENGTH);
    expect(record.error.stack).toBeUndefined();
    const logged = events.find(({ event }) => event === "decision-action-failed");
    expect(logged.fields.error.message).toHaveLength(MAX_ERROR_MESSAGE_LENGTH);
  });

  test("an oversized condition error leaves the decision unavailable with a bounded error and no extra fields", async () => {
    const condition = { type: "probe", evaluate: async () => ({ ok: false, error: { code: "probe-failed", message: huge, details: { raw: huge } } }) };
    const task = participantTask({ precondition: { condition: { type: "probe" } } });
    const { engine, store } = engineWith({ tasks: [task], conditions: [condition] });
    await engine.tick(NINE);
    const [record] = store.decisionLog.records();
    expect(record.state).toBe("unavailable");
    expect(record.availability.conditions[0].error).toEqual({ code: "probe-failed", message: `${"x".repeat(MAX_ERROR_MESSAGE_LENGTH - 1)}${TRUNCATION_MARKER}` });
  });

  test.each([
    ["ASCII", "x"],
    ["CJK", "漢"],
    ["control characters", "\u0001"],
  ])("a throwing snapshot with a huge %s message and stack stays within the snapshot cap", async (_label, unit) => {
    const failure = new Error(unit.repeat(5000));
    failure.stack = unit.repeat(50_000);
    const { engine, store } = engineWith({ snapshot: () => { throw failure; } });
    await engine.tick(NINE);
    const [record] = store.decisionLog.records();
    expect(record.state).toBe("completed");
    expect(record.snapshot.snapshotFailed.code).toBe("snapshot-threw");
    expect(record.snapshot.snapshotFailed.message).toHaveLength(MAX_ERROR_MESSAGE_LENGTH);
    expect(Buffer.byteLength(JSON.stringify(record.snapshot), "utf8")).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
  });

  test("a snapshot failure keeps a bounded stack when it fits", async () => {
    const { engine, store } = engineWith({ snapshot: () => { throw new Error("nope"); } });
    await engine.tick(NINE);
    const { snapshotFailed } = store.decisionLog.records()[0].snapshot;
    expect(snapshotFailed).toMatchObject({ code: "snapshot-threw", message: "nope" });
    expect(typeof snapshotFailed.stack).toBe("string");
  });

  test("a snapshot that throws a non-Error records a failure without a stack", async () => {
    const { engine, store } = engineWith({ snapshot: () => { throw "plain"; } });
    await engine.tick(NINE);
    expect(store.decisionLog.records()[0].snapshot).toEqual({ snapshotFailed: { code: "snapshot-threw", message: "plain" } });
  });
});
