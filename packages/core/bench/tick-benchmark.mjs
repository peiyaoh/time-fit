import { performance } from "node:perf_hooks";
import { createTimeEngine } from "../src/index.js";
import { createMemoryStore } from "../src/memory/index.js";

const TICK_AT = new Date("2026-09-22T09:00:00.000Z");
const ZONES = Object.freeze(["UTC", "Etc/GMT", "Africa/Abidjan", "Africa/Accra", "Atlantic/Reykjavik"]);
const SIZES = Object.freeze([
  Object.freeze({ participants: 1_000, tasks: 5 }),
  Object.freeze({ participants: 10_000, tasks: 20 }),
]);
const MEMORY_CONCURRENCIES = Object.freeze([1, 8]);
const SIMULATED_IO_CONCURRENCIES = Object.freeze([1, 8, 32]);
const SIMULATED_IO_DELAY_MILLISECONDS = 1;
const TIMED_TICKS_PER_CONFIGURATION = 3;
const alwaysMetCondition = Object.freeze({
  type: "benchmark-met",
  evaluate: async () => Object.freeze({ ok: true, met: true }),
});
const alwaysUnavailableCondition = Object.freeze({
  type: "benchmark-not-met",
  evaluate: async () => Object.freeze({ ok: true, met: false }),
});

const memoryMeasurements = await measureMatrix(SIZES, MEMORY_CONCURRENCIES, 0);
printMeasurements("Memory decision log", memoryMeasurements);

const simulatedIoMeasurements = await measureMatrix([SIZES[0]], SIMULATED_IO_CONCURRENCIES, SIMULATED_IO_DELAY_MILLISECONDS);
printMeasurements(`Simulated ${SIMULATED_IO_DELAY_MILLISECONDS} ms I/O per decision-log call`, simulatedIoMeasurements);

async function measureMatrix(sizes, concurrencies, decisionLogLatencyMilliseconds) {
  const measurements = [];
  for (const size of sizes) {
    for (const concurrency of concurrencies) {
      measurements.push(await measureConfiguration(size, concurrency, decisionLogLatencyMilliseconds));
    }
  }
  return measurements;
}

async function measureConfiguration(size, concurrency, decisionLogLatencyMilliseconds) {
  await runTick(size, concurrency, decisionLogLatencyMilliseconds);
  const samples = [];
  for (let index = 0; index < TIMED_TICKS_PER_CONFIGURATION; index += 1) {
    samples.push(await runTick(size, concurrency, decisionLogLatencyMilliseconds));
  }
  return medianByElapsedMilliseconds(samples);
}

async function runTick(size, concurrency, decisionLogLatencyMilliseconds) {
  const participants = buildParticipants(size.participants);
  const tasks = buildTasks(size.tasks);
  const store = createMemoryStore({ participants, tasks });
  const delayedDecisionLog = withSimulatedLatency(store.decisionLog, decisionLogLatencyMilliseconds);
  const timedDecisionLog = measureDecisionLog(delayedDecisionLog);
  const engine = createTimeEngine({
    participants: store.participants,
    decisionLog: timedDecisionLog.port,
    tasks,
    conditions: [alwaysMetCondition, alwaysUnavailableCondition],
    options: {
      concurrency,
      pageSize: 1_000,
      maxParticipants: size.participants,
      maxTasks: size.tasks,
    },
  });
  const startedAt = performance.now();
  const summary = await engine.tick(TICK_AT);
  const elapsedMilliseconds = performance.now() - startedAt;
  const decisions = summary.counts.occurrence;
  assertExpectedDecisionCount(decisions, size);
  return Object.freeze({
    ...size,
    concurrency,
    decisions,
    elapsedMilliseconds,
    ticksPerSecond: 1_000 / elapsedMilliseconds,
    decisionsPerSecond: (decisions * 1_000) / elapsedMilliseconds,
    decisionLogMilliseconds: timedDecisionLog.totalMilliseconds(),
    unavailableClaimMilliseconds: timedDecisionLog.unavailableClaimMilliseconds(),
  });
}

function medianByElapsedMilliseconds(samples) {
  const sorted = [...samples].sort((left, right) => left.elapsedMilliseconds - right.elapsedMilliseconds);
  return sorted[Math.floor(sorted.length / 2)];
}

function withSimulatedLatency(decisionLog, latencyMilliseconds) {
  if (latencyMilliseconds === 0) return decisionLog;
  const delayOperation = async (operation) => {
    await delay(latencyMilliseconds);
    return operation();
  };
  return Object.freeze({
    claim: (record, options) => delayOperation(() => decisionLog.claim(record, options)),
    complete: (decisionId, result) => delayOperation(() => decisionLog.complete(decisionId, result)),
    fail: (decisionId, error) => delayOperation(() => decisionLog.fail(decisionId, error)),
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertExpectedDecisionCount(decisions, { participants, tasks }) {
  const expected = participants * tasks;
  if (decisions !== expected) throw new Error(`benchmark expected ${expected} decisions, received ${decisions}`);
}

function buildParticipants(count) {
  return Array.from({ length: count }, (_unused, index) => Object.freeze({
    id: `participant-${String(index).padStart(6, "0")}`,
    timeZone: ZONES[index % ZONES.length],
  }));
}

function buildTasks(count) {
  return Array.from({ length: count }, (_unused, index) => createBenchmarkTask(index));
}

function createBenchmarkTask(index) {
  const checkpoint = index % 2 === 0
    ? { id: "at-nine", time: "09:00" }
    : { id: "at-nine", cron: "0 9 * * *" };
  return Object.freeze({
    id: `benchmark-task-${String(index).padStart(3, "0")}`,
    scope: "participant",
    checkpoints: [checkpoint],
    outcomes: [{ id: "control", probability: 1, action: null }],
    ...benchmarkPrecondition(index),
  });
}

function benchmarkPrecondition(index) {
  if (index % 4 === 0) return { precondition: { condition: { type: "benchmark-met" } } };
  if (index % 4 === 1) return { precondition: { condition: { type: "benchmark-not-met" } } };
  return {};
}

function measureDecisionLog(decisionLog) {
  let totalMilliseconds = 0;
  let unavailableClaimMilliseconds = 0;
  const measure = async (operation) => {
    const startedAt = performance.now();
    try {
      return await operation();
    } finally {
      totalMilliseconds += performance.now() - startedAt;
    }
  };
  return Object.freeze({
    port: Object.freeze({
      claim: async (record, claimOptions) => {
        const startedAt = performance.now();
        try {
          return await decisionLog.claim(record, claimOptions);
        } finally {
          const elapsedMilliseconds = performance.now() - startedAt;
          totalMilliseconds += elapsedMilliseconds;
          if (record.state === "unavailable") unavailableClaimMilliseconds += elapsedMilliseconds;
        }
      },
      complete: (decisionId, result) => measure(() => decisionLog.complete(decisionId, result)),
      fail: (decisionId, error) => measure(() => decisionLog.fail(decisionId, error)),
    }),
    totalMilliseconds: () => totalMilliseconds,
    unavailableClaimMilliseconds: () => unavailableClaimMilliseconds,
  });
}

function printMeasurements(title, measurements) {
  process.stdout.write(`\n${title} (median of ${TIMED_TICKS_PER_CONFIGURATION} ticks after 1 warm-up)\n`);
  process.stdout.write("| participants | tasks | concurrency | decisions | ticks/sec | decisions/sec | ms/tick | decision-log-call-ms (summed; overlaps) | unavailable-claim-ms |\n");
  process.stdout.write("|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n");
  measurements.forEach((measurement) => {
    const fields = [
      measurement.participants,
      measurement.tasks,
      measurement.concurrency,
      measurement.decisions,
      measurement.ticksPerSecond.toFixed(3),
      measurement.decisionsPerSecond.toFixed(1),
      measurement.elapsedMilliseconds.toFixed(1),
      measurement.decisionLogMilliseconds.toFixed(1),
      measurement.unavailableClaimMilliseconds.toFixed(1),
    ];
    process.stdout.write(`| ${fields.join(" | ")} |\n`);
  });
}
