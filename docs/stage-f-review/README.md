# Stage F review index

Stage F is complete. Measurements are report-only medians on macOS arm64 / Node 26 and vary by
machine; Stage G will publish the supported envelope in the package README.

| Round | Finding and outcome |
|---:|---|
| 0 | Implemented the occurrence memo, throughput benchmark, and concurrency/backpressure coverage; batching and `Condition.evaluateBatch` were deliberately deferred pending evidence. |
| 1 | F1 quadratic memory-store pruning, F2 tick context, and F3 required memo were all integrated. |
| 2 | F4 simulated-I/O benchmark and F5 median samples were integrated; F6's scoped `Map.values` regression spy was pushed back and accepted. |
| 3 | F7 Prisma SQLite concurrency-8 coverage, F8 summed-call-time wording, and F9 page-size guidance were all integrated. |
| 4 | F10 option-adjacent deployment guidance and F11 truthful Stage F status reporting were both integrated. |
| 5 | F12 repository-path wording and F13 final close-out documentation were both integrated. |

## Headline measurements

- Default-memory 10,000 × 20 tick at concurrency 1: 231.8 s baseline before pruning to about
  6.2 s after it (about 37× faster).
- Simulated 1 ms decision-log I/O, 1,000 × 5: concurrency 1 → 8 → 32 measured 462 → 3,354 →
  10,035 decisions/sec in the final independent check (about 22× from 1 to 32).
- Real Prisma SQLite adapter, 50 participants × 2 tasks at concurrency 8: all 100 decisions
  completed, with 0 claim, finalize, or already-claimed skips.

See the per-round reports for methods and full tables.
