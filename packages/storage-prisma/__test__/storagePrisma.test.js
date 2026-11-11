import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createTimeEngine } from "@time-fit/core";
import { decisionLogConformanceChecks } from "@time-fit/core/testing";
import { twilioSmsAction } from "@time-fit/integrations/twilio";
import { createPrismaStorage } from "../src/index.js";
import { PrismaClient } from "./generated/index.js";

const databaseDirectory = mkdtempSync(join(tmpdir(), "time-fit-storage-prisma-"));
const databasePath = join(databaseDirectory, "storage-prisma-test.db");
const databaseUrl = pathToFileURL(databasePath).href;
const initialDatabaseUrl = process.env.DATABASE_URL;
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const TICK_AT = new Date("2026-09-22T09:00:00.000Z");
let prisma;

beforeAll(async () => {
  execFileSync("yarn", ["prisma", "db", "push", "--skip-generate", "--schema", "__test__/schema.prisma"], {
    cwd: packageDirectory,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(databaseDirectory, { recursive: true, force: true });
});

beforeEach(async () => {
  await prisma.gap.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.task.deleteMany();
  await prisma.participant.deleteMany();
});

describe("decisionLog conformance", () => {
  for (const check of decisionLogConformanceChecks) {
    test(check.name, async () => {
      await check.run(async () => createPrismaStorage({ prisma }).decisionLog);
    });
  }
});

test("uses an isolated database without changing process-wide configuration", () => {
  expect(process.env.DATABASE_URL).toBe(initialDatabaseUrl);
  expect(databaseUrl).not.toBe(initialDatabaseUrl);
});

test("participants use stable bounded cursors and preserve JSON attributes", async () => {
  await prisma.participant.createMany({ data: [
    { id: "b", timeZone: "America/Detroit", attributes: { groups: ["trial"], profile: { n: 2 } } },
    { id: "a", timeZone: "UTC", attributes: { bool: true } },
    { id: "c", timeZone: "UTC", attributes: null },
  ] });
  const port = createPrismaStorage({ prisma }).participants;
  const first = await port.iterate({ cursor: null, limit: 2 });
  const second = await port.iterate({ cursor: first.nextCursor, limit: 2 });
  expect(first.items.map(({ id }) => id)).toEqual(["a", "b"]);
  expect(first.nextCursor).toBe("b");
  expect(first.items[1].attributes).toEqual({ groups: ["trial"], profile: { n: 2 } });
  expect(second.items.map(({ id }) => id)).toEqual(["c"]);
  expect(second.nextCursor).toBeNull();
});

test("tasks filter active range and return a detached JSON record", async () => {
  const now = new Date("2026-09-22T09:00:00.000Z");
  await prisma.task.createMany({ data: [
    { id: "active", spec: { id: "active", scope: "system", metadata: { arm: "a" } }, activeFrom: new Date("2026-09-22T08:00:00.000Z") },
    { id: "future", spec: { id: "future" }, activeFrom: new Date("2026-09-22T10:00:00.000Z") },
    { id: "finished", spec: { id: "finished" }, activeUntil: now },
  ] });
  const tasks = await createPrismaStorage({ prisma }).tasks.listActive(now);
  expect(tasks).toEqual([{ id: "active", scope: "system", metadata: { arm: "a" } }]);
  expect(Object.isFrozen(tasks)).toBe(true);
  expect(Object.isFrozen(tasks[0].metadata)).toBe(true);
});

test("record round-trip preserves decision JSON and only a claimed record transitions", async () => {
  const log = createPrismaStorage({ prisma }).decisionLog;
  const record = sampleRecord("round-trip");
  record.snapshot = { groups: ["intervention"], nested: { enabled: true } };
  record.randomization = { probabilities: { control: 0.5, treatment: 0.5 }, armId: "treatment", draw: 0.7 };
  await log.claim(record, { token: "tick" });
  await log.complete("round-trip", { finishedAt: "2026-09-22T09:00:01.000Z", delivery: { provider: "demo", tags: ["x"] } });
  const row = await prisma.decision.findUnique({ where: { decisionId: "round-trip" } });
  expect(row.state).toBe("completed");
  expect(row.record).toMatchObject({ ...record, claimToken: "tick", state: "completed", result: { delivery: { provider: "demo", tags: ["x"] } } });
  expect(await log.fail("round-trip", { finishedAt: "2026-09-22T09:00:02.000Z", error: { code: "late" } })).toEqual({ applied: false });
});

test("concurrent claims make exactly one different token owner", async () => {
  const log = createPrismaStorage({ prisma }).decisionLog;
  const results = await Promise.all(["one", "two", "three", "four"].map((token) => log.claim(sampleRecord("concurrent"), { token })));
  expect(results.filter(({ claimed }) => claimed)).toHaveLength(1);
});

test("SQLite storage completes concurrent engine decisions", async () => {
  const participants = Array.from({ length: 50 }, (_unused, index) => ({ id: `participant-${index}`, timeZone: "UTC" }));
  await prisma.participant.createMany({ data: participants });
  const storage = createPrismaStorage({ prisma });
  const engine = createTimeEngine({
    storage,
    tasks: [engineTask("first", 10), engineTask("second", 20)],
    options: { concurrency: 8 },
  });

  const summary = await engine.tick(TICK_AT);

  expect(summary.counts).toMatchObject({ occurrence: 100, claimed: 100, completed: 100, claimFailed: 0, finalizeFailed: 0, skippedClaimed: 0 });
  const decisions = await prisma.decision.findMany({ orderBy: { decisionId: "asc" } });
  expect(decisions).toHaveLength(100);
  expect(decisions.every((decision) => decision.state === "completed")).toBe(true);
});

test("a task that ended inside the engine's window still runs its earlier occurrence", async () => {
  await prisma.participant.create({ data: { id: "ada", timeZone: "UTC" } });
  const expiring = { ...engineTask("expiring", 10), activeUntil: "2026-09-22T09:01:00.000Z" };
  await prisma.task.create({ data: { id: "expiring", spec: expiring, activeUntil: new Date(expiring.activeUntil) } });
  const engine = createTimeEngine({ storage: createPrismaStorage({ prisma }) });

  const summary = await engine.tick(new Date("2026-09-22T09:02:00.000Z"));

  expect(summary.counts).toMatchObject({ occurrence: 1, completed: 1 });
  expect(await prisma.decision.count({ where: { state: "completed" } })).toBe(1);
});

test("listActive keeps tasks that end after windowFrom and drops older ones", async () => {
  const at = new Date("2026-09-22T09:02:00.000Z");
  await prisma.task.createMany({ data: [
    { id: "inside-window", spec: { id: "inside-window" }, activeUntil: new Date("2026-09-22T09:01:00.000Z") },
    { id: "before-window", spec: { id: "before-window" }, activeUntil: new Date("2026-09-22T08:56:00.000Z") },
  ] });
  const { tasks } = createPrismaStorage({ prisma });
  expect(await tasks.listActive(at, { windowFrom: new Date("2026-09-22T08:57:00.000Z") })).toEqual([{ id: "inside-window" }]);
  expect(await tasks.listActive(at)).toEqual([]);
});

test("more candidate tasks than maxTasks is an explicit error, not a truncated list", async () => {
  const at = new Date("2026-09-22T09:00:00.000Z");
  await prisma.task.createMany({ data: Array.from({ length: 3 }, (_unused, index) => ({ id: `task-${index}`, spec: { id: `task-${index}` } })) });
  await expect(createPrismaStorage({ prisma, maxTasks: 2 }).tasks.listActive(at)).rejects.toMatchObject({ code: "task-capacity-exceeded" });
  expect(await createPrismaStorage({ prisma, maxTasks: 3 }).tasks.listActive(at)).toHaveLength(3);
});

test("the default capacity of 500 aborts the tick at stage tasks when exceeded", async () => {
  await prisma.task.createMany({ data: Array.from({ length: 501 }, (_unused, index) => ({ id: `task-${String(index).padStart(3, "0")}`, spec: engineTask(`task-${index}`, 1) })) });
  const summary = await createTimeEngine({ storage: createPrismaStorage({ prisma }) }).tick(TICK_AT);
  expect(summary).toMatchObject({ completed: false, failedStage: "tasks" });
});

test("old tasks that expired before the window do not count toward capacity", async () => {
  const at = new Date("2026-09-22T09:02:00.000Z");
  const hourAgo = new Date("2026-09-22T08:02:00.000Z");
  await prisma.task.createMany({ data: [
    ...Array.from({ length: 5 }, (_unused, index) => ({ id: `old-${index}`, spec: { id: `old-${index}` }, activeUntil: hourAgo })),
    { id: "live", spec: { id: "live" } },
  ] });
  const { tasks } = createPrismaStorage({ prisma, maxTasks: 1 });
  expect(await tasks.listActive(at, { windowFrom: new Date("2026-09-22T08:57:00.000Z") })).toEqual([{ id: "live" }]);
});

test("nested participant attributes reach eligibility and a delivery action through SQLite", async () => {
  await prisma.participant.createMany({ data: [
    { id: "ada", timeZone: "UTC", attributes: { cohort: "pilot", phone: "+15550002" } },
    { id: "bob", timeZone: "UTC", attributes: { cohort: "control", phone: "+15550003" } },
    { id: "cy", timeZone: "UTC" },
  ] });
  const sent = [];
  const engine = createTimeEngine({
    storage: createPrismaStorage({ prisma }),
    tasks: [{
      id: "pilot-sms",
      scope: "participant",
      eligibility: { attributes: { mode: "all", match: { "attributes.cohort": ["pilot"] } } },
      checkpoints: [{ id: "morning", time: "09:00" }],
      outcomes: [{ id: "send", probability: 1, action: { type: "twilio-sms", body: "Time to move" } }],
    }],
    actions: [twilioSmsAction({ client: { messages: { create: async (message) => { sent.push(message.to); return { sid: "SM1" }; } } }, from: "+15550001", phonePath: "attributes.phone" })],
  });

  const summary = await engine.tick(TICK_AT);

  expect(summary.counts).toMatchObject({ ineligible: 2, completed: 1 });
  expect(sent).toEqual(["+15550002"]);
});

test("rejects malformed adapter input at the port boundary", async () => {
  expect(() => createPrismaStorage()).toThrow("prisma must provide");
  const storage = createPrismaStorage({ prisma });
  await expect(storage.participants.iterate({ cursor: "", limit: 1 })).rejects.toThrow("cursor");
  await expect(storage.participants.iterate({ cursor: null, limit: 0 })).rejects.toThrow("limit");
  await expect(storage.tasks.listActive(new Date("invalid"))).rejects.toThrow("valid Date");
  await expect(storage.tasks.listActive(TICK_AT, { windowFrom: new Date("invalid") })).rejects.toThrow("windowFrom must be a valid Date");
  await expect(storage.tasks.listActive(TICK_AT, { windowFrom: new Date("2026-09-22T09:00:01.000Z") })).rejects.toThrow("must not be after");
  for (const maxTasks of [0, 1.5, 10_001, "500"]) expect(() => createPrismaStorage({ prisma, maxTasks })).toThrow("maxTasks");
  await expect(storage.decisionLog.claim({ ...sampleRecord("bad"), state: "completed" }, { token: "tick" })).rejects.toThrow("state");
  await expect(storage.decisionLog.claim(sampleRecord("bad"), { token: "" })).rejects.toThrow("token");
  await expect(storage.decisionLog.complete("", { finishedAt: "2026-09-22T09:00:01.000Z" })).rejects.toThrow("decisionId");
  await expect(storage.decisionLog.complete("bad", { finishedAt: "not-an-instant" })).rejects.toThrow("ISO instant");
  await expect(storage.decisionLog.complete("bad", { finishedAt: "2026-09-22T09:00:01.000Z", delivery: () => undefined })).rejects.toThrow("structured-cloneable");
  await expect(storage.decisionLog.fail("bad", { finishedAt: "2026-09-22T09:00:01.000Z", error: null })).rejects.toThrow("error");
  await expect(storage.decisionLog.recordGap({ from: new Date("2026-09-22T09:01:00Z"), to: new Date("2026-09-22T09:00:00Z"), tickId: "tick" })).rejects.toThrow("before");
  await expect(storage.decisionLog.recordGap({ from: new Date("2026-09-22T09:00:00Z"), to: new Date("2026-09-22T09:01:00Z"), tickId: "" })).rejects.toThrow("tickId");
});

test("preserves a Prisma failure that is not a unique-claim collision", async () => {
  const failure = Object.assign(new Error("database down"), { code: "P1001" });
  const failingPrisma = {
    participant: { findMany: async () => [] }, task: { findMany: async () => [] }, gap: { findMany: async () => [], create: async () => ({}) },
    decision: { findMany: async () => [], create: async () => { throw failure; }, findUnique: async () => null, updateMany: async () => ({ count: 0 }) },
  };
  await expect(createPrismaStorage({ prisma: failingPrisma }).decisionLog.claim(sampleRecord("failure"), { token: "tick" })).rejects.toBe(failure);
});

function sampleRecord(decisionId) {
  return {
    schema: "time-fit.decision/v1", decisionId, tickId: "tick", scope: "participant", participantId: "person",
    taskId: "task", taskVersion: "version", checkpointId: "checkpoint", scheduledAt: "2026-09-22T09:00:00.000Z",
    timeZone: "UTC", evaluatedAt: "2026-09-22T09:00:00.000Z", latenessMs: 0,
    availability: { available: true, reasons: [], conditions: [] }, randomization: null, action: null,
    state: "claimed", claimedAt: "2026-09-22T09:00:00.000Z",
  };
}

function engineTask(id, priority) {
  return {
    id,
    scope: "participant",
    priority,
    checkpoints: [{ id: "morning", time: "09:00" }],
    outcomes: [{ id: "control", probability: 1, action: null }],
  };
}
