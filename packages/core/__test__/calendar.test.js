import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { normalizeCheckpoint, occurrences, localDatesForWindow } from "../src/checkpoint.js";
import { isValidTimeZone } from "../src/timeZone.js";
import { loadFixture } from "./support/fixtures.js";

const calendar = loadFixture("calendar.json");

describe("calendar fixtures (ADR 0005)", () => {
  test.each(calendar.zones)("zone $zone valid=$valid", ({ zone, valid }) => {
    expect(isValidTimeZone(zone)).toBe(valid);
  });

  // The result must not depend on when the engine runs: a fold resolved while the host clock
  // is in daylight saving time and in standard time must give the same instant.
  describe.each([
    ["daylight saving time", "2026-07-01T12:00:00.000Z"],
    ["standard time", "2026-12-01T12:00:00.000Z"],
  ])("with the host clock in %s", (_season, wallClock) => {
    beforeEach(() => jest.useFakeTimers({ now: new Date(wallClock), doNotFake: ["nextTick", "setImmediate"] }));
    afterEach(() => jest.useRealTimers());

    test.each(calendar.occurrences)("$name", ({ checkpoint, zone, from, to, expected, resolvedTime }) => {
      expect(Date.now()).toBe(Date.parse(wallClock));
      const normalized = normalizeCheckpoint(checkpoint);
      expect(normalized.ok).toBe(true);
      const window = { checkpoint: normalized.value, timeZone: zone, from: new Date(from), to: new Date(to) };
      const resolvedTimes =
        resolvedTime === undefined
          ? undefined
          : Object.fromEntries(localDatesForWindow(window).map((isoDate) => [isoDate, resolvedTime]));

      const actual = occurrences({ ...window, resolvedTimes }).map((instant) => instant.toISOString());

      expect(actual).toEqual(expected);
    });
  });

  test.each(calendar.invalidCheckpoints)("$name is rejected", ({ checkpoint, code }) => {
    const result = normalizeCheckpoint(checkpoint);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(code);
  });
});
