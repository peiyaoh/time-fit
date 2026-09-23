import notifier from "node-notifier";
import { pathToFileURL } from "node:url";
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotificationAction } from "@time-fit/integrations/desktop";

const TASK = Object.freeze({
  id: "take-a-break",
  scope: "system",
  timeZone: "America/Detroit",
  checkpoints: [{ id: "weekday-half-hour", cron: "*/30 * * * 1-5" }],
  outcomes: [{ id: "notify", probability: 1, action: { type: "desktop-notification", message: "It's 30 minutes already. Take a break from your screen!" } }],
});

/** Creates the database-free take-a-break engine; tests may inject a deterministic notifier. */
export function createTakeABreakEngine({ desktopNotifier = notifier } = {}) {
  const storage = createMemoryStore({ tasks: [TASK] });
  return createTimeEngine({ storage, actions: [desktopNotificationAction({ notifier: desktopNotifier, title: "TimeFit" })] });
}

/** Executes one deterministic tick for the CI smoke test and embedding examples. */
export function runTakeABreakTick(now, options) {
  return createTakeABreakEngine(options).tick(now);
}

if (isDirectExecution()) createTakeABreakEngine().start();

function isDirectExecution() {
  return process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
}
