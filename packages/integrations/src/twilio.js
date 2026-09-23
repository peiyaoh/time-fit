import { assertFactoryClient, assertSafePath, assertTextOption, abortedResult, destinationFor, freezeAction, providerFailure, validateTextParams } from "./shared.js";

/** @param {{ client: { messages: { create: Function } }, from: string, phonePath?: string }} options */
export function twilioSmsAction({ client, from, phonePath = "phone" } = {}) {
  assertFactoryClient(client, ["messages", "create"], "twilioSmsAction");
  const sender = assertTextOption(from, "from", "twilioSmsAction");
  const destinationPath = assertSafePath(phonePath, "phonePath", "twilioSmsAction");
  return freezeAction({
    type: "twilio-sms",
    validate: (params) => validateTextParams(params, ["body"]),
    async execute(params, ctx = {}) {
      const validation = validateTextParams(params, ["body"]);
      if (!validation.ok) return validation;
      const aborted = abortedResult(ctx.signal);
      if (aborted !== null) return aborted;
      const destination = destinationFor(ctx.participant, destinationPath, "missing-phone-destination", "phone number");
      if (!destination.ok) return destination;
      try {
        const message = await client.messages.create({ to: destination.value, from: sender, body: params.body });
        return Object.freeze({ ok: true, delivery: Object.freeze({ provider: "twilio", messageSid: message?.sid ?? null, status: message?.status ?? null, decisionId: ctx.decisionId ?? null }) });
      } catch (error) {
        return providerFailure("twilio", error);
      }
    },
  });
}
