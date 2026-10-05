import { expect, test } from "@jest/globals";
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotificationAction } from "../src/desktop.js";

const NINE = new Date("2026-09-22T09:00:00.000Z");

function taskWith(action) {
  return { id: "nudge", scope: "participant", checkpoints: [{ id: "nine", time: "09:00" }], outcomes: [{ id: "send", probability: 1, action }] };
}

/** Runs one tick for one participant and returns the stored decision record. */
async function runOnce({ action, participant = { id: "ada", timeZone: "UTC" }, params, options }) {
  const store = createMemoryStore({ participants: [participant], tasks: [taskWith({ type: action.type, ...params })] });
  const engine = createTimeEngine({ storage: store, actions: [action], options });
  const summary = await engine.tick(NINE);
  const [record] = store.decisionLog.records();
  return { summary, record };
}

function laterCallbackNotifier(outcome) {
  return {
    notify(options, callback) {
      setTimeout(() => (outcome instanceof Error ? callback(outcome) : callback(null, outcome)), 5);
      return this;
    },
  };
}

test("desktop: the engine records completion only after a later notifier callback", async () => {
  const action = desktopNotificationAction({ notifier: laterCallbackNotifier("timeout") });
  const { record } = await runOnce({ action, params: { message: "Stand up" } });
  expect(record).toMatchObject({ state: "completed", result: { delivery: { provider: "desktop", response: { response: "timeout" }, decisionId: record.decisionId } } });
});

test("desktop: a later notifier callback error fails the decision", async () => {
  const action = desktopNotificationAction({ notifier: laterCallbackNotifier(new Error("notification center unavailable")) });
  const { record } = await runOnce({ action, params: { message: "Stand up" } });
  expect(record).toMatchObject({ state: "failed", error: { code: "desktop-send-failed", message: "notification center unavailable" } });
});
