# Stage F review: run 2 (Codex response)

**Reviewed commit:** `8000f4f`
**Response date:** 2026-09-25
**Machine:** macOS 26.6.2, arm64 / Node v26.4.0

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| F4: the benchmark cannot show when concurrency helps | Integrated | The benchmark now measures a 1 ms delay before every decision-log call for the 1,000 × 5 grid. The median improves from 407.7 decisions/sec (12,262.8 ms/tick) at concurrency 1 to 2,713.0 (1,843.0 ms) at 8 and 6,987.7 (715.5 ms) at 32, making I/O wait parallelism visible without changing the ADR 0005 default of 1. | `packages/core/bench/tick-benchmark.mjs`, `docs/jitai-library-plan-progress.md` |
| F5: one cold sample per configuration | Integrated | Every configuration now runs one un-timed warm-up, followed by three timed ticks built with fresh stores and engines; the benchmark reports the median elapsed sample. This removes claim deduplication between samples and reduces JIT/GC noise without introducing a benchmark framework. | `packages/core/bench/tick-benchmark.mjs` |
| F6: the prune guard observes `Map.prototype.values` | Pushed back | The guard demonstrably fails the exact `c39ae8f` regression, whose prune copied `records.values()` on every claim. A behavioral alternative still needs instrumentation to observe traversal, while a 10,000-record timing assertion is slower and flaky; the current spy is scoped and restored, and functional retention/cap tests independently protect outcomes. | `packages/core/__test__/memoryStore.test.js` |

## Median benchmark results

The report-only script uses one warm-up plus the median of three fresh-engine timed ticks per
configuration. It keeps the default 10,000-record memory cap, uses five time zones,
alternating cron/fixed-time checkpoints, met/not-met preconditions, and no-op actions.

### Memory decision log

| Grid | Concurrency | Decisions/sec | ms/tick | Decision-log ms |
|---|---:|---:|---:|---:|
| 1,000 × 5 | 1 | 43,891.5 | 113.9 | 27.9 |
| 1,000 × 5 | 8 | 50,977.8 | 98.1 | 139.2 |
| 10,000 × 20 | 1 | 32,387.4 | 6,175.2 | 4,113.7 |
| 10,000 × 20 | 8 | 33,918.2 | 5,896.5 | 19,733.1 |

### Simulated 1 ms I/O per decision-log call

Only the smaller 1,000 × 5 grid runs this latency case. It intentionally models decision-log
wait time rather than a database's exact pool, query, or network behavior.

| Concurrency | Decisions/sec | ms/tick | Decision-log ms |
|---:|---:|---:|---:|
| 1 | 407.7 | 12,262.8 | 11,686.7 |
| 8 | 2,713.0 | 1,843.0 | 14,327.2 |
| 32 | 6,987.7 | 715.5 | 22,000.6 |

With an I/O-bound adapter, throughput scales roughly with concurrency until the database
saturates; start at 8 and tune for the deployment. The default remains 1 as ADR 0005 requires.

## Scope retained

No engine API, adapter capability, default option, batching, worker-thread, or
`Condition.evaluateBatch` change was needed, so no ADR was added. The benchmark remains
report-only and outside the core package's published `files`.

## Verification

- `yarn workspace @time-fit/core test:coverage`: 11 suites, 341 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/storage-prisma test:coverage`: 1 suite, 16 tests, 100% coverage.
- `yarn workspace @time-fit/integrations test:coverage`: 1 suite, 11 tests, 100% coverage.
- `yarn test`: 32 suites, 456 tests passed.
- `node scripts/check-core-dependencies.mjs`, `yarn depcruise --config .dependency-cruiser.cjs packages`,
  and `./scripts/verify-packed-quickstart.sh` passed.
