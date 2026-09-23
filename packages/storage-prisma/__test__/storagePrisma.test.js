import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decisionLogConformanceChecks } from "@time-fit/core/testing";
import { createPrismaStorage } from "../src/index.js";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));
const databasePath = fileURLToPath(new URL("storage-prisma-test.db", import.meta.url));
let prisma;

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  execFileSync("yarn", ["prisma", "generate", "--schema", "__test__/schema.prisma"], { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" });
  process.env.DATABASE_URL = `file:${databasePath}`;
  const { PrismaClient } = await import("./generated/index.js");
  prisma = new PrismaClient();
  execFileSync("yarn", ["prisma", "db", "push", "--skip-generate", "--schema", "__test__/schema.prisma"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env: { ...process.env }, stdio: "inherit" });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(databasePath, { force: true });
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

test("rejects malformed adapter input at the port boundary", async () => {
  expect(() => createPrismaStorage()).toThrow("prisma must provide");
  const storage = createPrismaStorage({ prisma });
  await expect(storage.participants.iterate({ cursor: "", limit: 1 })).rejects.toThrow("cursor");
  await expect(storage.participants.iterate({ cursor: null, limit: 0 })).rejects.toThrow("limit");
  await expect(storage.tasks.listActive(new Date("invalid"))).rejects.toThrow("valid Date");
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
