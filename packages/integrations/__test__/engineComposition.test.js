import { expect, test } from "@jest/globals";
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotificationAction } from "../src/desktop.js";
import { mailjetEmailAction } from "../src/mailjet.js";
import { twilioSmsAction } from "../src/twilio.js";

const NINE = new Date("2026-09-22T09:00:00.000Z");

function taskWith(action) {
  return { id: "nudge", scope: "participant", checkpoints: [{ id: "nine", time: "09:00" }], outcomes: [{ id: "send", probability: 1, action }] };
}

/** Runs one tick for one participant and returns the stored decision record. */
async function runOnce({ action, participant = { id: "ada", timeZone: "UTC" }, params, options, eligibility }) {
  const task = { ...taskWith({ type: action.type, ...params }), ...(eligibility === undefined ? {} : { eligibility }) };
  const store = createMemoryStore({ participants: [participant], tasks: [task] });
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

// The shape @time-fit/storage-prisma returns: custom fields live under `attributes`.
const nestedParticipant = Object.freeze({ id: "ada", timeZone: "UTC", attributes: { cohort: "pilot", phone: "+15550002", email: "ada@example.test" } });
const pilotOnly = Object.freeze({ attributes: { mode: "all", match: { "attributes.cohort": ["pilot"] } } });

test("twilio: an engine decision texts the participant's number and records the provider id", async () => {
  const sent = [];
  const client = { messages: { create: async (message) => { sent.push(message); return { sid: "SM1", status: "queued" }; } } };
  const action = twilioSmsAction({ client, from: "+15550001", phonePath: "attributes.phone" });
  const { record } = await runOnce({ action, participant: nestedParticipant, eligibility: pilotOnly, params: { body: "Time to move" } });
  expect(sent).toEqual([{ to: "+15550002", from: "+15550001", body: "Time to move" }]);
  expect(record).toMatchObject({ state: "completed", result: { delivery: { provider: "twilio", messageSid: "SM1", status: "queued", decisionId: record.decisionId } } });
});

test("twilio: a provider rejection and a missing number both fail the decision with a code", async () => {
  const rejecting = twilioSmsAction({ client: { messages: { create: async () => { throw new Error("unverified sender"); } } }, from: "+15550001", phonePath: "attributes.phone" });
  expect((await runOnce({ action: rejecting, participant: nestedParticipant, params: { body: "hi" } })).record).toMatchObject({ state: "failed", error: { code: "twilio-send-failed", message: "unverified sender" } });
  const defaultPath = twilioSmsAction({ client: { messages: { create: async () => ({ sid: "SM1" }) } }, from: "+15550001" });
  expect((await runOnce({ action: defaultPath, participant: nestedParticipant, params: { body: "hi" } })).record).toMatchObject({ state: "failed", error: { code: "missing-phone-destination" } });
});

test("twilio: a hanging client ends as plugin-timeout", async () => {
  const hanging = twilioSmsAction({ client: { messages: { create: () => new Promise(() => {}) } }, from: "+15550001", phonePath: "attributes.phone" });
  const { record } = await runOnce({ action: hanging, participant: nestedParticipant, params: { body: "hi" }, options: { pluginTimeoutMs: 20 } });
  expect(record).toMatchObject({ state: "failed", error: { code: "plugin-timeout" } });
});

test("mailjet: an engine decision emails the participant with CustomID equal to the stored decisionId", async () => {
  const requests = [];
  const client = { post: () => ({ request: async (body) => { requests.push(body); return { body: { Messages: [{ To: [{ MessageID: 42 }] }] } }; } }) };
  const action = mailjetEmailAction({ client, from: { email: "study@example.test", name: "Study" }, emailPath: "attributes.email" });
  const { record } = await runOnce({ action, participant: nestedParticipant, eligibility: pilotOnly, params: { subject: "Break", text: "Stand up" } });
  expect(requests).toHaveLength(1);
  expect(requests[0].Messages[0]).toMatchObject({ To: [{ Email: "ada@example.test" }], CustomID: record.decisionId });
  expect(record).toMatchObject({ state: "completed", result: { delivery: { provider: "mailjet", messageId: 42, decisionId: record.decisionId } } });
});

test("mailjet: a provider rejection fails the decision, and a hanging client times out", async () => {
  const rejecting = mailjetEmailAction({ client: { post: () => ({ request: async () => { throw new Error("quota exceeded"); } }) }, from: { email: "study@example.test", name: "Study" }, emailPath: "attributes.email" });
  expect((await runOnce({ action: rejecting, participant: nestedParticipant, params: { subject: "Break", text: "x" } })).record).toMatchObject({ state: "failed", error: { code: "mailjet-send-failed", message: "quota exceeded" } });
  const hanging = mailjetEmailAction({ client: { post: () => ({ request: () => new Promise(() => {}) }) }, from: { email: "study@example.test", name: "Study" }, emailPath: "attributes.email" });
  expect((await runOnce({ action: hanging, participant: nestedParticipant, params: { subject: "Break", text: "x" }, options: { pluginTimeoutMs: 20 } })).record).toMatchObject({ state: "failed", error: { code: "plugin-timeout" } });
});

test("a participant without attributes is ineligible for an attributes.* eligibility filter", async () => {
  const action = twilioSmsAction({ client: { messages: { create: async () => ({ sid: "SM1" }) } }, from: "+15550001", phonePath: "attributes.phone" });
  const { summary, record } = await runOnce({ action, participant: { id: "bob", timeZone: "UTC" }, eligibility: pilotOnly, params: { body: "hi" } });
  expect(summary.counts).toMatchObject({ ineligible: 1, completed: 0 });
  expect(record).toBeUndefined();
});

test("mailjet: the recipient is redacted from a provider error in both the record and the log", async () => {
  const email = nestedParticipant.attributes.email;
  const client = { post: () => ({ request: async (body) => { const to = body.Messages[0].To[0].Email; throw new Error(`"${to}" is an invalid email address (${to})`); } }) };
  const action = mailjetEmailAction({ client, from: { email: "study@example.test", name: "Study" }, emailPath: "attributes.email" });
  const { record, logged } = await runOnce({ action, participant: nestedParticipant, params: { subject: "Break", text: "x" } });
  expect(record.error).toEqual({ code: "mailjet-send-failed", message: '"[recipient]" is an invalid email address ([recipient])' });
  expect(JSON.stringify(logged.find(({ event }) => event === "decision-action-failed"))).not.toContain(email);
});
