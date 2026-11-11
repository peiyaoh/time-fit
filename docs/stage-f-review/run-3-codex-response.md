# Stage F review: run 3 (Codex response)

**Reviewed commit:** `556a5f6`
**Response date:** 2026-09-27
**Machine:** macOS 26.6.2, arm64 / Node v26.4.0

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| F7: test the concurrency guidance against the SQLite Prisma adapter | Integrated | A real `createPrismaStorage({ prisma })` engine tick seeds 50 participants and two due tasks, then runs at concurrency 8. It records 100 occurrences, claims, and completions; `claimFailed`, `finalizeFailed`, and `skippedClaimed` are each 0, and all 100 persisted records are `completed`. This validates the guidance on the existing SQLite test database without adding retries that would alter ADR 0004's at-most-once semantics. | `packages/storage-prisma/__test__/storagePrisma.test.js` |
| F8: cumulative decision-log time can be mistaken for wall time | Integrated | Benchmark output now labels this column `decision-log-call-ms (summed; overlaps)`, making clear that concurrent calls intentionally accumulate more call time than the enclosing tick duration. | `packages/core/bench/tick-benchmark.mjs` |
| F9: small final page waves leave workers idle | Integrated | Added deployment guidance to keep `pageSize` several times larger than concurrency (for example, `pageSize >= 4 × concurrency`). It reduces underfilled final waves while retaining the deliberate page-by-page backpressure and bounded-memory behavior; no prefetching was added. | `docs/jitai-library-plan-progress.md` |

## Benchmark

`yarn workspace @time-fit/core benchmark` remains report-only and runs one warm-up plus the
median of three fresh-engine ticks. The call-time values below are summed operation durations,
so they overlap under concurrency and are not wall-clock time.

### Memory decision log

| Grid | Concurrency | Decisions/sec | ms/tick | Decision-log call ms (summed; overlaps) |
|---|---:|---:|---:|---:|
| 1,000 × 5 | 1 | 41,378.6 | 120.8 | 30.6 |
| 1,000 × 5 | 8 | 48,669.9 | 102.7 | 167.3 |
| 10,000 × 20 | 1 | 31,051.2 | 6,441.0 | 4,213.8 |
| 10,000 × 20 | 8 | 33,024.4 | 6,056.1 | 20,336.7 |

### Simulated 1 ms I/O per decision-log call (1,000 × 5)

| Concurrency | Decisions/sec | ms/tick | Decision-log call ms (summed; overlaps) |
|---:|---:|---:|---:|
| 1 | 450.4 | 11,102.1 | 10,552.5 |
| 8 | 3,138.9 | 1,592.9 | 12,423.2 |
| 32 | 9,885.0 | 505.8 | 15,569.6 |

## Verification

- `yarn workspace @time-fit/core test:coverage`: 11 suites, 341 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/storage-prisma test:coverage`: 1 suite, 17 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/integrations test:coverage`: 1 suite, 11 tests, 100% statements,
  branches, functions, and lines.
- `yarn test`: 32 suites, 457 tests passed.
- `node scripts/check-core-dependencies.mjs`: passed.
- `yarn depcruise --config .dependency-cruiser.cjs packages`: passed (75 modules, 122 dependencies).
- `./scripts/verify-packed-quickstart.sh`: passed.

## Scope retained

No public API, adapter retry, prefetching, default-concurrency, or ADR change was needed.
The SQLite test is intentionally an adapter integration check, not a claim retry policy: failed
claim or finalize operations remain visible in tick results under the accepted delivery contract.
