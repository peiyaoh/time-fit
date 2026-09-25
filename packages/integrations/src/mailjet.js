import { assertFactoryClient, assertSafePath, assertTextOption, abortedResult, destinationFor, freezeAction, providerFailure, validateMailjetParams } from "./shared.js";

/** @param {{ client: { post: Function }, from: { email: string, name: string }, emailPath?: string }} options */
export function mailjetEmailAction({ client, from, emailPath = "email" } = {}) {
  assertFactoryClient(client, ["post"], "mailjetEmailAction");
  const sender = Object.freeze({ Email: assertTextOption(from?.email, "from.email", "mailjetEmailAction"), Name: assertTextOption(from?.name, "from.name", "mailjetEmailAction") });
  const destinationPath = assertSafePath(emailPath, "emailPath", "mailjetEmailAction");
  return freezeAction({
    type: "mailjet-email",
    validate: validateMailjetParams,
    async execute(params, ctx = {}) {
      const validation = validateMailjetParams(params);
      if (!validation.ok) return validation;
      const aborted = abortedResult(ctx.signal);
      if (aborted !== null) return aborted;
      const destination = destinationFor(ctx.participant, destinationPath, "missing-email-destination", "email address");
      if (!destination.ok) return destination;
      try {
        const request = client.post("send", { version: "v3.1" });
        if (typeof request?.request !== "function") throw new TypeError("mailjet client post() must return an object with request()");
        const result = await request.request({ Messages: [buildMailjetMessage(sender, destination.value, params, ctx.decisionId)] });
        return Object.freeze({ ok: true, delivery: Object.freeze({ provider: "mailjet", messageId: result?.body?.Messages?.[0]?.To?.[0]?.MessageID ?? null, decisionId: ctx.decisionId ?? null }) });
      } catch (error) {
        return providerFailure("mailjet", error);
      }
    },
  });
}

function buildMailjetMessage(from, email, params, decisionId) {
  return {
    From: from,
    To: [{ Email: email }],
    Subject: params.subject,
    ...(typeof params.text === "string" ? { TextPart: params.text } : {}),
    ...(typeof params.html === "string" ? { HTMLPart: params.html } : {}),
    ...(typeof decisionId === "string" ? { CustomID: decisionId } : {}),
  };
}
