# Stage F review: run 0 (Codex implementation)

**Date:** 2026-09-25
**Machine:** macOS 26.6.2, arm64
**Node:** v26.4.0

## Delivered

- Added `yarn workspace @time-fit/core benchmark`, a report-only synthetic tick benchmark.
  It builds 1,000 × 5 and 10,000 × 20 participant-task grids using five valid zones,
  alternating cron and fixed-time checkpoints, met/not-met preconditions, memory storage,
  and null (no-op) actions.
- Added a per-tick memo for cron and fixed-time `occurrences()` results. The key contains
  `taskVersion`, checkpoint id, zone, and both window endpoints; it stores frozen epoch
  milliseconds and returns fresh `Date` values. Preference checkpoints remain per-participant.
- Ran every one of the 18 engine scenarios with concurrency 1 and 3, and added focused
  assertions for participant task ordering, exactly-once participant processing, and page/action
  backpressure while actions are blocked.

The benchmark retains one decision record because a single tick never repeats a decision ID;
that keeps the real memory-port calls in the workload without measuring the memory adapter's
historical-record retention scan rather than engine throughput. It is outside the core tarball
because `@time-fit/core` publishes only `src/`.

## Benchmark

Command: `yarn workspace @time-fit/core benchmark`.

| Grid | Concurrency | Before decisions/sec | Before ms/tick | After decisions/sec | After ms/tick |
|---|---:|---:|---:|---:|---:|
| 1,000 × 5 | 1 | 6,204.1 | 805.9 | 41,115.3 | 121.6 |
| 1,000 × 5 | 8 | 6,828.9 | 732.2 | 50,552.5 | 98.9 |
| 10,000 × 20 | 1 | 7,365.2 | 27,154.7 | 65,650.2 | 3,046.4 |
| 10,000 × 20 | 8 | 7,432.1 | 26,910.2 | 76,486.6 | 2,614.8 |

The 10,000 × 20 single-worker case improved from 0.037 to 0.328 ticks/sec (about 8.9×),
and the eight-worker case improved from 0.037 to 0.382 ticks/sec (about 10.3×).

## Scope decisions

- **Batched terminal-unavailable writes: skipped.** In the optimized 10,000 × 20,
  concurrency-1 run, all measured decision-log calls took 1,085.0 ms of a 3,046.4 ms tick,
  but terminal-unavailable claims—the only writes that could legally batch—took only 239.0 ms
  (7.8%). Claimed records still require their individual claim before action, so an additive
  batch port would not address the measured dominant available-decision path.
- **`Condition.evaluateBatch`: skipped.** The benchmark uses local, constant-result conditions;
  it contains no realistic DB-backed condition demonstrating condition evaluation as a bottleneck.
  ADR 0003's reserved capability remains unimplemented.
- **No new ADR.** The cache is private engine state; it adds no option, port, or public API.

## Verification so far

- `yarn workspace @time-fit/core test`: 11 suites, 340 tests passed.
- `yarn workspace @time-fit/core test:coverage`: 11 suites, 340 tests passed, 100% statements,
  branches, functions, and lines.
- The scenario fixture matrix executes 36 cases (18 fixtures at each required concurrency).
- `yarn test`: 32 suites, 455 tests passed.
- `node scripts/check-core-dependencies.mjs`, `yarn depcruise --config .dependency-cruiser.cjs packages`,
  and `./scripts/verify-packed-quickstart.sh` passed.
