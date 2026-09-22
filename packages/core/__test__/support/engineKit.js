import { createTimeEngine } from "../../src/index.js";
import { createMemoryStore } from "../../src/memory/index.js";

export const NINE = new Date("2026-09-22T09:00:00.000Z");
export const alice = Object.freeze({ id: "alice", timeZone: "UTC" });

export const recordingAction = (calls = []) => ({
  type: "record",
  execute: async (params, ctx) => {
    calls.push({ params, ctx });
    return { ok: true, delivery: { n: calls.length } };
  },
});

export const participantTask = (overrides = {}) => ({
  id: "walk-prompt",
  scope: "participant",
  checkpoints: [{ id: "morning", time: "09:00" }],
  outcomes: [{ id: "notify", probability: 1, action: { type: "record" } }],
  ...overrides,
});

/** Captures structured log events as { level, event, fields }. */
export function captureLogger() {
  const events = [];
  const logger = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level, (event, fields) => events.push({ level, event, fields })]));
  return { logger, events, names: () => events.map((entry) => entry.event) };
}

export function engineWith({ participants = [alice], tasks = [participantTask()], actions, ...rest } = {}) {
  const calls = [];
  const store = createMemoryStore({ participants, tasks });
  const capture = captureLogger();
  const engine = createTimeEngine({ storage: store, actions: actions ?? [recordingAction(calls)], logger: capture.logger, ...rest });
  return { engine, store, calls, ...capture };
}
