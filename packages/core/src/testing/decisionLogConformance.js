import assert from "node:assert/strict";

/**
 * Checks every `decisionLog` adapter must pass (ADR 0002, ADR 0004 §5). Test-runner
 * agnostic: each check is `run(createDecisionLog)` and throws an AssertionError on failure.
 *
 * Usage (any runner):
 *   for (const check of decisionLogConformanceChecks) test(check.name, () => check.run(makeLog));
 *
 * `createDecisionLog` must return a fresh, empty decision log on every call.
 */

const SCHEDULED_AT = "2026-09-22T09:00:00.000Z";
const FINISHED_AT = "2026-09-22T09:00:01.000Z";

function sampleRecord(decisionId, state = "claimed") {
  return {
    schema: "time-fit.decision/v1",
    decisionId,
    tickId: "tick-a",
    scope: "participant",
    participantId: "alice",
    taskId: "walk-prompt",
    taskVersion: "v",
    checkpointId: "morning",
    scheduledAt: SCHEDULED_AT,
    timeZone: "UTC",
    evaluatedAt: SCHEDULED_AT,
    latenessMs: 0,
    availability: { available: state === "claimed", reasons: [], conditions: [] },
    randomization: null,
    action: null,
    state,
    claimedAt: SCHEDULED_AT,
  };
}

const complete = (log, decisionId) => log.complete(decisionId, { finishedAt: FINISHED_AT, delivery: null });
const fail = (log, decisionId) => log.fail(decisionId, { finishedAt: FINISHED_AT, error: { code: "x", message: "x" } });

export const decisionLogConformanceChecks = Object.freeze([
  {
    name: "claim inserts a new decision",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      assert.deepEqual(await log.claim(sampleRecord("d1"), { token: "tick-a" }), { claimed: true });
    },
  },
  {
    name: "re-claim with the same token succeeds (retry-safe)",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      await log.claim(sampleRecord("d1"), { token: "tick-a" });
      assert.deepEqual(await log.claim(sampleRecord("d1"), { token: "tick-a" }), { claimed: true });
    },
  },
  {
    name: "claim with a different token is refused, even if never completed",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      await log.claim(sampleRecord("d1"), { token: "tick-a" });
      assert.deepEqual(await log.claim(sampleRecord("d1"), { token: "tick-b" }), { claimed: false });
    },
  },
  {
    name: "concurrent claims with different tokens: exactly one wins",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      const tokens = ["t1", "t2", "t3", "t4", "t5"];
      const results = await Promise.all(tokens.map((token) => log.claim(sampleRecord("d1"), { token })));
      assert.equal(results.filter((result) => result.claimed).length, 1);
    },
  },
  {
    name: "complete applies once; later complete/fail are no-ops",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      await log.claim(sampleRecord("d1"), { token: "tick-a" });
      assert.deepEqual(await complete(log, "d1"), { applied: true });
      assert.deepEqual(await complete(log, "d1"), { applied: false });
      assert.deepEqual(await fail(log, "d1"), { applied: false });
    },
  },
  {
    name: "fail applies once to a claimed decision",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      await log.claim(sampleRecord("d1"), { token: "tick-a" });
      assert.deepEqual(await fail(log, "d1"), { applied: true });
      assert.deepEqual(await complete(log, "d1"), { applied: false });
    },
  },
  {
    name: "unavailable is terminal at claim time",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      assert.deepEqual(await log.claim(sampleRecord("d1", "unavailable"), { token: "tick-a" }), { claimed: true });
      assert.deepEqual(await complete(log, "d1"), { applied: false });
      assert.deepEqual(await log.claim(sampleRecord("d1"), { token: "tick-b" }), { claimed: false });
    },
  },
  {
    name: "transitions on unknown decisions are no-ops",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      assert.deepEqual(await complete(log, "missing"), { applied: false });
      assert.deepEqual(await fail(log, "missing"), { applied: false });
    },
  },
  {
    name: "decisions are independent",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      await log.claim(sampleRecord("d1"), { token: "tick-a" });
      assert.deepEqual(await log.claim(sampleRecord("d2"), { token: "tick-b" }), { claimed: true });
      assert.deepEqual(await complete(log, "d2"), { applied: true });
      assert.deepEqual(await complete(log, "d1"), { applied: true });
    },
  },
  {
    name: "recordGap, when provided, accepts a gap",
    async run(createDecisionLog) {
      const log = await createDecisionLog();
      if (log.recordGap === undefined) return;
      await log.recordGap({ from: new Date(SCHEDULED_AT), to: new Date(FINISHED_AT), tickId: "tick-a" });
    },
  },
]);
