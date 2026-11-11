# Stage F review: run 4 (Claude)

**Reviewed:** `5058d71` (round 3 response), plus a holistic pass over the whole Stage F diff
(`17ad6e4..5058d71`).
**Verdict:** F7–F9 are integrated. The SQLite concurrency-8 test backs the guidance with our
real adapter. The total engine-source change for Stage F is small (`schedule.js` and `tick.js`
together are +24/−24 lines, and `createMemoryStore.js` is +23), which fits the "no
over-engineering" goal. I re-checked a few things and they hold:
- The per-tick memo has no race: its get/set pair is synchronous between awaits.
- Insertion-order pruning cannot drop a record that is still inside the retention window: the
  cutoff is derived from the record being inserted.
- The cap-eviction tradeoff only matters for a store that survives restarts, and the memory
  store does not.

What remains is making the results discoverable and keeping the plan truthful.

## Findings

### F10 (small): the guidance lives only in the progress log
"Start at 8 for I/O-bound adapters" and "keep `pageSize` several times larger than
`concurrency`" are recorded only in `docs/jitai-library-plan-progress.md`. Developers read
the option definitions, not the progress log. **Ask:** put a one-line hint on the
`concurrency` and `pageSize` entries of the `EngineOptions` JSDoc in
`packages/core/src/engine/config.js`, for example "raise for I/O-bound adapters (start at
8; measured in stage-f-review/)" and "keep ≥ 4 × concurrency". Do not change the defaults.

### F11 (small): the plan still promises work that was measured and declined
In `docs/jitai-library-plan.md`, Stage F's **Change** paragraph still lists "batched decision
writes" and "log levels", with no record of what happened. **Ask:** extend the Stage F status
block (keep it "in review" until run 5) with one line each:
- **Built:** per-tick occurrence memo; O(1) memory-store pruning (a quadratic bug found by
  review); a benchmark with a latency case; concurrency tests including SQLite at 8.
- **Declined, with numbers:** batched unavailable writes (15.8% of a default-store tick),
  `Condition.evaluateBatch` (no evidence). Log levels already existed: per-participant events
  are debug-level.
- **Headline:** 10k × 20 default store, 231.8 s → 6.2 s per tick. With 1 ms I/O, concurrency 32
  is about 22× concurrency 1.

Stage G will publish the measured envelope in the README; note that as the follow-up.

## Not requested
No code changes beyond F10's JSDoc lines. Specifically: no memo size cap. It is bounded by
tasks × checkpoints × distinct zones seen in one tick and discarded at tick end, so a cap adds
a branch without a realistic benefit.
