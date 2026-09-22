import { resolveEngineConfig } from "./config.js";
import { describeError } from "./logging.js";
import { runTick } from "./tick.js";

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * @typedef {object} TimeEngine
 * @property {(now?: Date) => Promise<Readonly<object>>} tick   primary entry point (ADR 0005 §4)
 * @property {() => void} start      convenience: tick at every minute boundary
 * @property {() => Promise<void>} stop  resolves after any in-flight tick finishes
 */

/**
 * Creates an engine instance. Configuration is validated up front; an unusable config throws
 * `EngineConfigError` listing every problem. Nothing is global: two engines never share state.
 * @param {object} config  see ADR 0002 / docs for fields
 * @returns {Readonly<TimeEngine>}
 */
export function createTimeEngine(config) {
  const engine = resolveEngineConfig(config);
  let lastTick = null;
  let inFlightTick = null;
  let timer = null;
  let running = false;

  async function tick(now = engine.clock.now()) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError("tick: now must be a valid Date");
    if (inFlightTick !== null) {
      engine.logger.warn("tick-skipped-in-flight", { now: now.toISOString() });
      return Object.freeze({ skipped: "in-flight" });
    }
    const tickTime = new Date(now);
    inFlightTick = runTick(engine, lastTick, tickTime)
      .then(({ summary, advanceLastTick }) => {
        if (advanceLastTick) lastTick = tickTime;
        return summary;
      })
      .finally(() => {
        inFlightTick = null;
      });
    return inFlightTick;
  }

  function start() {
    if (running) return;
    running = true;
    scheduleNextMinute();
  }

  async function stop() {
    running = false;
    clearTimeout(timer);
    timer = null;
    // Only waiting for completion here; a failing tick already rejected to its own caller.
    if (inFlightTick !== null) await inFlightTick.catch(() => undefined);
  }

  // Re-armed before each tick runs, so stop() during a tick clears the next timer too.
  function scheduleNextMinute() {
    const delay = MILLISECONDS_PER_MINUTE - (engine.clock.now().getTime() % MILLISECONDS_PER_MINUTE);
    timer = setTimeout(onMinuteBoundary, delay);
  }

  async function onMinuteBoundary() {
    scheduleNextMinute();
    try {
      await tick(engine.clock.now());
    } catch (error) {
      // A bug inside tick must not kill the timer loop; the next minute tries again.
      engine.logger.error("tick-crashed", { error: describeError(error) });
    }
  }

  return Object.freeze({ tick, start, stop });
}
