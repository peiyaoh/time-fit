# Stage F review: run 1 (Codex response)

**Reviewed commit:** `c39ae8f`
**Response date:** 2026-09-25
**Machine:** macOS 26.6.2, arm64 / Node v26.4.0

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| F1: memory-store pruning is quadratic and the benchmark hides it | Integrated | Default-cap baseline on the run-0 engine was 862.7 decisions/sec / 231,834.5 ms per 10,000 × 20 tick at concurrency 1, with 229,559.0 ms in decision-log calls. Pruning now deletes only the expired insertion-order prefix and evicts the oldest entry until the cap is met, which is O(1) amortized for monotonic schedule insertion; the public JSDoc documents the bounded out-of-order retention caveat. A regression test fails the former full-scan implementation by asserting ordinary, non-evicting claims never invoke `Map.prototype.values`. | `packages/core/src/memory/createMemoryStore.js`, `packages/core/__test__/memoryStore.test.js`, `packages/core/bench/tick-benchmark.mjs` |
| F2: tick helpers carry too many positional values | Integrated | A frozen `tickContext` now owns the engine, tick, window, logger, and per-tick cache. Participant and subject helpers receive that context instead of repeatedly threading the same values. | `packages/core/src/engine/tick.js` |
| F3: optional occurrence memo exists only for tests | Integrated | `findDueOccurrences` now requires the internal memo. Production always supplied one, and direct schedule tests explicitly provide their own `Map`; this removes the fallback and invalid-memo guard without changing the package API. | `packages/core/src/engine/schedule.js`, `packages/core/__test__/engineRuntime.test.js` |

## Corrected default-memory benchmark

The before run used the `c39ae8f` engine and memory store with only the benchmark's
`maxRecords: 1` override removed. The after run uses the integrated pruning implementation
with the benchmark's normal default `maxRecords: 10,000`.

| Grid | Concurrency | Before decisions/sec | Before ms/tick | After decisions/sec | After ms/tick |
|---|---:|---:|---:|---:|---:|
| 1,000 × 5 | 1 | 3,127.1 | 1,598.9 | 39,179.9 | 127.6 |
| 1,000 × 5 | 8 | 3,199.5 | 1,562.7 | 45,452.9 | 110.0 |
| 10,000 × 20 | 1 | 862.7 | 231,834.5 | 32,115.0 | 6,227.6 |
| 10,000 × 20 | 8 | 865.2 | 231,155.3 | 34,079.1 | 5,868.7 |

The benchmark keeps the run-0 workload: five valid zones, alternating cron/fixed-time
checkpoints, met/not-met preconditions, real memory storage, and null actions. Its report is
not a CI gate and the benchmark directory remains outside the package's published `files`.

## Scope retained

No batched writes or `Condition.evaluateBatch` were added. In the default-memory 10,000 × 20,
concurrency-1 after run, decision-log calls total 4,091.5 ms, but terminal-unavailable claims
are only 986.4 ms (15.8%) of the 6,227.6 ms tick; the remaining claimed-record operations
cannot batch before actions. Adding an optional adapter capability remains larger than the
isolated improvement it could make in this in-memory benchmark.

No ADR was added: no public option, port, record shape, or package export changed.

## Verification

- `yarn workspace @time-fit/core test:coverage`: 11 suites, 341 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/storage-prisma test:coverage`: 1 suite, 16 tests, 100% coverage.
- `yarn workspace @time-fit/integrations test:coverage`: 1 suite, 11 tests, 100% coverage.
- `yarn test`: 32 suites, 456 tests passed.
- `node scripts/check-core-dependencies.mjs`, `yarn depcruise --config .dependency-cruiser.cjs packages`,
  and `./scripts/verify-packed-quickstart.sh` passed.
