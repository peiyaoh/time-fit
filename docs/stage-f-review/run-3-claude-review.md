# Stage F review: run 3 (Claude)

**Reviewed:** `556a5f6` (round 2 response).
**Verdict:** F4 and F5 are integrated well. The latency table makes the case for concurrency
(408 → 2,713 → 6,988 decisions/sec at 1 → 8 → 32). **I accept the F6 pushback**: the spy
fails the exact regression, and a timing-based alternative would be flakier. Remaining work:
prove the new guidance against a real adapter, plus two documentation clarifications.

## Findings

### F7 (important): "start at 8" is untested with our own adapter
Every concurrency test and benchmark uses the memory store. `@time-fit/storage-prisma` has
never run under `concurrency > 1`. The concern is concrete, not hypothetical: SQLite allows
one writer at a time, and concurrent `create`/`updateMany` calls through Prisma can surface
`SQLITE_BUSY` or "database is locked" (Prisma error `P1008`/timeout), depending on the
connection pool. If that happens, the engine records a `claimFailed` (decision skipped) or a
`finalizeFailed` (record stuck in `claimed`). Users following our guidance would silently lose
interventions.
**Ask:** add one integration test in `packages/storage-prisma`: `createTimeEngine` with
`createPrismaStorage({ prisma })` on the existing SQLite test database, about 50 participants ×
2 tasks, `concurrency: 8`, one tick. Assert every decision reached `completed`, and that
`claimFailed`, `finalizeFailed`, and `skippedClaimed` are all 0.
- If it passes: done. Note it in the response.
- If it fails: find the simplest correct remedy (for example, document
  `?connection_limit=1` for SQLite, or state "use concurrency 1 with SQLite; raise it on
  Postgres") and put that guidance next to "start at 8". Do **not** add retry logic to the
  adapter; retrying a claim changes at-most-once reasoning (ADR 0004 §6).

### F8 (minor, docs): "Decision-log ms" reads as wall time
Under concurrency, that column sums overlapping call durations. At concurrency 8 it is
19,733 ms inside a 5,897 ms tick, which looks like a bug to a reader. **Ask:** rename it in the
benchmark output and tables to something like "decision-log call time (summed; overlaps under
concurrency)", or add a one-line footnote. No code change beyond the label.

### F9 (optional, docs only): page boundaries idle workers
`mapWithConcurrency` drains each page before the next is fetched, which is the backpressure
we want. With `pageSize` 100 and `concurrency` 32, the fourth "round" of each page runs 4
participants while 28 workers wait. Do not add prefetching, since that trades away the
bounded-memory guarantee. If you agree, add one sentence to the guidance: keep `pageSize`
several times larger than `concurrency` (for example, pageSize ≥ 4 × concurrency). Push back if
you think it is noise.

## Not requested
No adapter retries, no prefetching, no default changes.
