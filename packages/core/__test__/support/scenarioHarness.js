import { createTimeEngine, computeTaskVersion, timeWindowCondition, validateTaskSpec } from "../../src/index.js";
import { createMemoryStore } from "../../src/memory/index.js";
import { err, ok } from "../../src/result.js";

/** Runs one scenario from engine-scenarios.json and returns everything tests assert on. */
export async function runScenario(scenario) {
  const harness = createHarness(scenario);
  for (const step of scenario.steps) await harness.apply(step);
  return harness.observations();
}

function createHarness(scenario) {
  const callLog = [];
  const logEvents = [];
  const gate = createGate();
  const plugins = fixturePlugins(callLog, gate);
  const store = createMemoryStore({ participants: scenario.participants, tasks: scenario.tasks });
  const logger = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level, (event) => logEvents.push(event)]));
  const makeEngine = () => createTimeEngine({ storage: store, ...plugins, logger, options: scenario.options });
  let engine = makeEngine();
  let lastSummary = null;
  const pending = [];

  const stepHandlers = {
    async tick(iso, step) {
      const result = await engine.tick(new Date(iso));
      if (step.expectResult !== undefined) {
        expect(result).toEqual(step.expectResult);
      } else {
        lastSummary = result;
      }
    },
    async tickWithoutAwait(iso) {
      pending.push(engine.tick(new Date(iso)));
    },
    async awaitPending() {
      lastSummary = (await Promise.all(pending)).at(-1);
    },
    async restart() {
      engine = makeEngine();
    },
    async replaceTask(spec) {
      store.tasks.upsert(spec);
    },
    async concurrentTicks({ engines, now }) {
      const instances = Array.from({ length: engines }, makeEngine);
      const summaries = await Promise.all(instances.map((instance) => instance.tick(new Date(now))));
      lastSummary = summaries.at(-1);
    },
    async releaseGate() {
      gate.release();
    },
  };

  return {
    async apply(step) {
      const [kind] = Object.keys(step).filter((key) => key !== "expectResult");
      await stepHandlers[kind](step[kind], step);
    },
    observations() {
      return {
        records: store.decisionLog.records(),
        gaps: store.decisionLog.gaps(),
        callLog,
        logEvents,
        lastSummary,
        versionOf: (spec) => versionOf(spec, plugins),
      };
    },
  };
}

function versionOf(spec, plugins) {
  const toMap = (list) => new Map(list.map((plugin) => [plugin.type, plugin]));
  const context = {
    conditionTypes: toMap([timeWindowCondition, ...plugins.conditions]),
    actionTypes: toMap(plugins.actions),
    hasPreferenceResolver: false,
  };
  return computeTaskVersion(validateTaskSpec(spec, context).value);
}

// Fixture plugins as defined in fixtures/README.md.
function fixturePlugins(callLog, gate) {
  const validate = (params) => (params.rejectParams === true ? err("fixture-rejected", "rejectParams") : ok(undefined));
  const condition = (type, evaluate) => ({ type, validate, evaluate });
  const record = (params, ctx) => {
    callLog.push({ taskId: ctx.taskId, decisionId: ctx.decisionId, params });
    return { ok: true, delivery: { callIndex: callLog.length - 1 } };
  };
  return {
    conditions: [
      condition("fixture-met", async () => ({ ok: true, met: true })),
      condition("fixture-not-met", async () => ({ ok: true, met: false })),
      condition("fixture-error", async () => ({ ok: false, error: { code: "fixture-error", message: "fixture condition error" } })),
      condition("fixture-throws", async () => {
        throw new Error("fixture condition threw");
      }),
    ],
    actions: [
      { type: "fixture-record", validate, execute: async (params, ctx) => record(params, ctx) },
      {
        type: "fixture-throws",
        validate,
        execute: async () => {
          throw new Error("fixture action threw");
        },
      },
      {
        type: "fixture-gate",
        validate,
        execute: async (params, ctx) => {
          await gate.opened;
          return record(params, ctx);
        },
      },
    ],
  };
}

function createGate() {
  let release;
  const opened = new Promise((resolve) => {
    release = resolve;
  });
  return { opened, release };
}
