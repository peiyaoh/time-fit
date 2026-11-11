import { abortedResult, assertFactoryClient, assertTextOption, freezeAction, providerFailure, validateTextParams } from "./shared.js";

const DEFAULT_TITLE = "TimeFit";

/**
 * @typedef {{ message: string }} DesktopNotificationParams
 * @typedef {{ notify: (options: { title: string, message: string, sound: boolean, wait: boolean }, callback: (error: Error | null | undefined, response?: unknown, metadata?: unknown) => void) => unknown }} DesktopNotifier
 *   node-notifier's shape: completion comes from the callback unless notify returns a promise
 */

/**
 * @param {{ notifier: DesktopNotifier, title?: string }} options
 * @returns {Readonly<import("@time-fit/core").ActionPlugin<DesktopNotificationParams>>}
 */
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
    // A returned promise is the completion signal. Any other return value is only a handle
    // (node-notifier returns the notifier itself), so completion comes from the callback.
    if (typeof result?.then === "function") result.then(resolveOnce, rejectOnce);
  });
}
