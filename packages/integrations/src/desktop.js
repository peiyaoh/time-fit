import { abortedResult, assertFactoryClient, assertTextOption, freezeAction, providerFailure, validateTextParams } from "./shared.js";

const DEFAULT_TITLE = "TimeFit";

/** @param {{ notifier: { notify: Function }, title?: string }} options */
export function desktopNotificationAction({ notifier, title = DEFAULT_TITLE } = {}) {
  assertFactoryClient(notifier, ["notify"], "desktopNotificationAction");
  const notificationTitle = assertTextOption(title, "title", "desktopNotificationAction");
  return freezeAction({
    type: "desktop-notification",
    validate: (params) => validateTextParams(params, ["message"]),
    async execute(params, ctx = {}) {
      const validation = validateTextParams(params, ["message"]);
      if (!validation.ok) return validation;
      const aborted = abortedResult(ctx.signal);
      if (aborted !== null) return aborted;
      try {
        const response = await notifyDesktop(notifier, { title: notificationTitle, message: params.message, sound: false, wait: true });
        return Object.freeze({ ok: true, delivery: Object.freeze({ provider: "desktop", response: response ?? null, decisionId: ctx.decisionId ?? null }) });
      } catch (error) {
        return providerFailure("desktop", error);
      }
    },
  });
}

function notifyDesktop(notifier, options) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback) => (value) => {
      if (!settled) {
        settled = true;
        callback(value);
      }
    };
    const resolveOnce = settle(resolve);
    const rejectOnce = settle(reject);
    const callback = (error, response, metadata) => error === null || error === undefined ? resolveOnce({ response, metadata }) : rejectOnce(error);
    const result = notifier.notify(options, callback);
    if (result?.then !== undefined) result.then(resolveOnce, rejectOnce);
    else if (result !== undefined) resolveOnce(result);
  });
}
