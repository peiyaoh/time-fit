// Quickstart: a memory-only time-based intervention in about 20 lines.
// Run with `node index.mjs` after `npm install @time-fit/core`.
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";

const store = createMemoryStore({ participants: [{ id: "ada", timeZone: "America/Detroit" }] });

const printReminder = {
  type: "print-reminder",
  execute: async ({ message }, { participant, scheduledAt }) => {
    console.log(`[${scheduledAt.toISOString()}] to ${participant.id}: ${message}`);
    return { ok: true, delivery: { channel: "console" } };
  },
};

const engine = createTimeEngine({
  storage: store,
  actions: [printReminder],
  tasks: [
    {
      id: "stretch-break",
      scope: "participant",
      checkpoints: [{ id: "mid-morning", time: "10:30", daysOfWeek: [1, 2, 3, 4, 5] }],
      outcomes: [
        { id: "remind", probability: 0.5, action: { type: "print-reminder", message: "Time to stretch!" } },
        { id: "control", probability: 0.5, action: null },
      ],
    },
  ],
});

// tick() is the primary entry point; call it from cron, a serverless job, or engine.start().
const summary = await engine.tick(new Date("2026-09-22T14:30:00Z")); // 10:30 in Detroit, a Tuesday
console.log(JSON.stringify({ counts: summary.counts, decisions: store.decisionLog.records().map((r) => ({ state: r.state, arm: r.randomization.armId })) }));
