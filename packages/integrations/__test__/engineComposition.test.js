import { expect, test } from "@jest/globals";
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotificationAction } from "../src/desktop.js";
import { twilioSmsAction } from "../src/twilio.js";

const NINE = new Date("2026-09-22T09:00:00.000Z");

function taskWith(action) {
  return { id: "nudge", scope: "participant", checkpoints: [{ id: "nine", time: "09:00" }], outcomes: [{ id: "send", probability: 1, action }] };
}

/** Runs one tick for one participant and returns the stored decision record. */
async function runOnce({ action, participant = { id: "ada", timeZone: "UTC" }, params, options }) {
  const store = createMemoryStore({ participants: [participant], tasks: [taskWith({ type: action.type, ...params })] });
  const logged = [];
  const logger = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level, (event, fields) => logged.push({ event, fields })]));
  const engine = createTimeEngine({ storage: store, actions: [action], options, logger });
  const summary = await engine.tick(NINE);
  const [record] = store.decisionLog.records();
  return { summary, record, logged };
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

test("twilio: the recipient is redacted from a provider error in both the record and the log, even across the length bound", async () => {
  const phone = "+15550002";
  const client = { messages: { create: async ({ to }) => { throw new Error(`${"x".repeat(1018)} ${to} and ${to}`); } } };
  const { record, logged } = await runOnce({ action: twilioSmsAction({ client, from: "+15550001" }), participant: { id: "ada", timeZone: "UTC", phone }, params: { body: "hi" } });
  expect(record.state).toBe("failed");
  expect(record.error.message).toHaveLength(1024);
  expect(record.error.message).not.toContain("+1555");
  const logEntry = logged.find(({ event }) => event === "decision-action-failed");
  expect(JSON.stringify(logEntry)).not.toContain(phone);
  expect(JSON.stringify(record)).not.toContain(phone);
});
