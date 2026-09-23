import { expect, test } from "@jest/globals";
import { desktopNotificationAction } from "../src/desktop.js";
import { twilioSmsAction } from "../src/twilio.js";
import { mailjetEmailAction } from "../src/mailjet.js";
import { MAX_MESSAGE_LENGTH } from "../src/shared.js";

test("desktop action supports callback notifiers and exposes a frozen ActionResult", async () => {
  const calls = [];
  const action = desktopNotificationAction({ notifier: { notify(options, callback) { calls.push(options); callback(null, "clicked", { id: "n1" }); } }, title: "Break" });
  const result = await action.execute({ message: "Stand up" }, { decisionId: "d1" });
  expect(Object.isFrozen(action)).toBe(true);
  expect(calls).toEqual([{ title: "Break", message: "Stand up", sound: false, wait: true }]);
  expect(result).toEqual({ ok: true, delivery: { provider: "desktop", response: { response: "clicked", metadata: { id: "n1" } }, decisionId: "d1" } });
  expect(Object.isFrozen(result.delivery)).toBe(true);
});

test("desktop action supports promise notifiers and contains provider errors", async () => {
  const success = desktopNotificationAction({ notifier: { notify: async () => "sent" } });
  const failure = desktopNotificationAction({ notifier: { notify: () => { throw new Error("notifier down"); } } });
  expect(await success.execute({ message: "Hello" }, {})).toMatchObject({ ok: true, delivery: { response: "sent" } });
  expect(await failure.execute({ message: "Hello" }, {})).toEqual({ ok: false, error: { code: "desktop-send-failed", message: "notifier down" } });
});

test("desktop action supports immediate and callback-error notifier APIs", async () => {
  const immediate = desktopNotificationAction({ notifier: { notify: () => null } });
  const callbackFailure = desktopNotificationAction({ notifier: { notify: (options, callback) => callback(new Error("dismissed")) } });
  expect(await immediate.execute({ message: "Hello" }, {})).toMatchObject({ ok: true, delivery: { response: null, decisionId: null } });
  expect(await callbackFailure.execute({ message: "Hello" }, {})).toEqual({ ok: false, error: { code: "desktop-send-failed", message: "dismissed" } });
});

test("desktop action validates input and honors an already-aborted signal", async () => {
  const action = desktopNotificationAction({ notifier: { notify: () => undefined } });
  expect(action.validate([])).toMatchObject({ ok: false, error: { code: "invalid-action-params" } });
  expect(action.validate({})).toEqual({ ok: false, error: { code: "missing-message", message: "message must be a non-empty string" } });
  expect(await action.execute({ message: "ok" }, { signal: AbortSignal.abort() })).toEqual({ ok: false, error: { code: "action-aborted", message: "action signal is already aborted" } });
  expect(await action.execute({ message: "x".repeat(MAX_MESSAGE_LENGTH + 1) }, {})).toMatchObject({ ok: false, error: { code: "invalid-message" } });
});

test("twilio action resolves only own participant paths and returns provider ids", async () => {
  const calls = [];
  const action = twilioSmsAction({ client: { messages: { create: async (options) => { calls.push(options); return { sid: "SM1", status: "queued" }; } } }, from: "+15550001", phonePath: "contact.phone" });
  const result = await action.execute({ body: "Take a break" }, { participant: { contact: { phone: "+15550002" } }, decisionId: "d2" });
  expect(calls).toEqual([{ to: "+15550002", from: "+15550001", body: "Take a break" }]);
  expect(result).toEqual({ ok: true, delivery: { provider: "twilio", messageSid: "SM1", status: "queued", decisionId: "d2" } });
  expect(await action.execute({ body: "x" }, { participant: { contact: Object.create({ phone: "+1555" }) } })).toMatchObject({ ok: false, error: { code: "missing-phone-destination" } });
});

test("twilio action validates and contains rejected provider calls", async () => {
  const action = twilioSmsAction({ client: { messages: { create: async () => { throw "denied"; } } }, from: "+15550001" });
  expect(action.validate({ body: "" })).toMatchObject({ ok: false, error: { code: "missing-body" } });
  expect(await action.execute({ body: "" }, { participant: { phone: "+1555" } })).toMatchObject({ ok: false, error: { code: "missing-body" } });
  expect(await action.execute({ body: "hello" }, { participant: { phone: "" } })).toMatchObject({ ok: false, error: { code: "missing-phone-destination" } });
  expect(await action.execute({ body: "hello" }, { participant: { phone: "+1555" } })).toEqual({ ok: false, error: { code: "twilio-send-failed", message: "denied" } });
  expect(await action.execute({ body: "hello" }, { participant: { phone: "+1555" }, signal: AbortSignal.abort() })).toMatchObject({ ok: false, error: { code: "action-aborted" } });
  const emptyResponse = twilioSmsAction({ client: { messages: { create: async () => ({}) } }, from: "+15550001" });
  expect(await emptyResponse.execute({ body: "hello" }, { participant: { phone: "+1555" } })).toMatchObject({ ok: true, delivery: { messageSid: null, status: null, decisionId: null } });
});

test("mailjet action uses CustomID and returns the provider message id", async () => {
  const calls = [];
  const action = mailjetEmailAction({ client: { post(endpoint, options) { expect([endpoint, options]).toEqual(["send", { version: "v3.1" }]); return { request: async (body) => { calls.push(body); return { body: { Messages: [{ To: [{ MessageID: 42 }] }] } }; } }; } }, from: { email: "sender@example.test", name: "Sender" } });
  const result = await action.execute({ subject: "Break", text: "Stand", html: "<p>Stand</p>" }, { participant: { email: "ada@example.test" }, decisionId: "d3" });
  expect(calls).toEqual([{ Messages: [{ From: { Email: "sender@example.test", Name: "Sender" }, To: [{ Email: "ada@example.test" }], Subject: "Break", TextPart: "Stand", HTMLPart: "<p>Stand</p>", CustomID: "d3" }] }]);
  expect(result).toEqual({ ok: true, delivery: { provider: "mailjet", messageId: 42, decisionId: "d3" } });
});

test("mailjet action validates, handles malformed clients, and contains provider failures", async () => {
  const invalidClient = mailjetEmailAction({ client: { post: () => ({}) }, from: { email: "sender@example.test", name: "Sender" } });
  const rejectingClient = mailjetEmailAction({ client: { post: () => ({ request: async () => { throw new Error("rejected"); } }) }, from: { email: "sender@example.test", name: "Sender" } });
  expect(invalidClient.validate({ subject: "hi" })).toMatchObject({ ok: false, error: { code: "missing-email-content" } });
  expect(invalidClient.validate([])).toMatchObject({ ok: false, error: { code: "invalid-action-params" } });
  expect(invalidClient.validate({ subject: "", text: "body" })).toMatchObject({ ok: false, error: { code: "missing-subject" } });
  expect(invalidClient.validate({ subject: "hi", text: "x".repeat(MAX_MESSAGE_LENGTH + 1) })).toMatchObject({ ok: false, error: { code: "invalid-email-content" } });
  expect(await invalidClient.execute({ subject: "" }, { participant: { email: "ada@example.test" } })).toMatchObject({ ok: false, error: { code: "missing-subject" } });
  expect(await invalidClient.execute({ subject: "hi", text: "body" }, { participant: { email: "ada@example.test" }, signal: AbortSignal.abort() })).toMatchObject({ ok: false, error: { code: "action-aborted" } });
  expect(await invalidClient.execute({ subject: "hi", text: "body" }, { participant: {} })).toMatchObject({ ok: false, error: { code: "missing-email-destination" } });
  expect(await invalidClient.execute({ subject: "hi", text: "body" }, { participant: { email: "ada@example.test" } })).toMatchObject({ ok: false, error: { code: "mailjet-send-failed" } });
  expect(await rejectingClient.execute({ subject: "hi", html: "<p>x</p>" }, { participant: { email: "ada@example.test" } })).toEqual({ ok: false, error: { code: "mailjet-send-failed", message: "rejected" } });
});

test("mailjet omits absent content and CustomID safely", async () => {
  const calls = [];
  const action = mailjetEmailAction({ client: { post: () => ({ request: async (body) => { calls.push(body); return {}; } }) }, from: { email: "sender@example.test", name: "Sender" } });
  expect(await action.execute({ subject: "Hi", html: "<p>Only HTML</p>" }, { participant: { email: "ada@example.test" } })).toMatchObject({ ok: true, delivery: { messageId: null, decisionId: null } });
  expect(calls[0].Messages[0]).toEqual({ From: { Email: "sender@example.test", Name: "Sender" }, To: [{ Email: "ada@example.test" }], Subject: "Hi", HTMLPart: "<p>Only HTML</p>" });
  await action.execute({ subject: "Hi", text: "Only text" }, { participant: { email: "ada@example.test" } });
  expect(calls[1].Messages[0].TextPart).toBe("Only text");
});

test("factories reject invalid injected clients and unsafe destination paths", () => {
  expect(() => desktopNotificationAction()).toThrow("notify");
  expect(() => twilioSmsAction({ client: {}, from: "from" })).toThrow("messages.create");
  expect(() => twilioSmsAction({ client: { messages: { create() {} } }, from: "from", phonePath: "__proto__.phone" })).toThrow("safe");
  expect(() => twilioSmsAction({ client: { messages: { create() {} } }, from: "from", phonePath: "" })).toThrow("safe");
  expect(() => mailjetEmailAction({ client: { post() {} }, from: { email: "", name: "Sender" } })).toThrow("from.email");
});

test("desktop subpath resolves without optional vendor SDKs", async () => {
  const module = await import("@time-fit/integrations/desktop");
  expect(module.desktopNotificationAction).toBe(desktopNotificationAction);
});
