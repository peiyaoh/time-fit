import { expect, test } from "@jest/globals";
import { runTakeABreakTick } from "../index.js";

function promiseNotifier() {
  const shown = [];
  return { shown, notifier: { notify: async (options) => { shown.push(options); return "shown"; } } };
}

// Each case uses a fresh engine, so only the default five-minute catch-up window is evaluated.
test.each([
  ["a Detroit weekday half hour", "2026-09-22T14:30:00.000Z", 1],
  ["a Detroit weekday quarter hour", "2026-09-22T14:15:00.000Z", 0],
  ["Friday 20:30 in Detroit, already Saturday in UTC", "2026-09-26T00:30:00.000Z", 1],
  ["a Detroit Saturday half hour", "2026-09-26T14:30:00.000Z", 0],
])("%s (%s) notifies %i time(s)", async (_label, instant, expected) => {
  const { shown, notifier } = promiseNotifier();
  const summary = await runTakeABreakTick(new Date(instant), { desktopNotifier: notifier });
  expect(summary.counts.completed).toBe(expected);
  expect(shown).toHaveLength(expected);
  if (expected > 0) expect(shown[0]).toMatchObject({ title: "TimeFit", message: expect.stringContaining("Take a break") });
});

test("a node-notifier-style notifier that calls back later completes the decision", async () => {
  const notifier = { notify(options, callback) { setTimeout(() => callback(null, "timeout"), 5); return this; } };
  const summary = await runTakeABreakTick(new Date("2026-09-22T14:30:00.000Z"), { desktopNotifier: notifier });
  expect(summary.counts).toMatchObject({ completed: 1, failed: 0 });
});

test("a notifier callback error is recorded as a failed decision", async () => {
  const notifier = { notify(options, callback) { setTimeout(() => callback(new Error("notifications disabled")), 5); return this; } };
  const summary = await runTakeABreakTick(new Date("2026-09-22T14:30:00.000Z"), { desktopNotifier: notifier });
  expect(summary.counts).toMatchObject({ completed: 0, failed: 1 });
});
