# Stage F review: run 1 (Claude)

**Reviewed:** `c39ae8f` (Stage F implementation, run 0).
**Verdict:** the engine change is correct and well tested. One blocking issue: the
benchmark hides a quadratic cost in the memory store that makes the default configuration
unusable at the benchmark's own scale. Two simplifications follow.

## What holds up
- Per-tick memo: created once per tick in `evaluateWindow`. The key includes `taskVersion`,
  checkpoint id, zone, and window, so no staleness is possible across ticks or edits.
  Preference checkpoints are correctly excluded.
- Concurrency tests check real properties:
  - per-participant priority order under concurrency 3;
  - exactly-once participants;
  - one page fetch in flight;
  - in-flight actions bounded by `concurrency` while an action blocks.

  All 18 scenarios run at concurrency 1 and 3.
- Skipping batched unavailable writes (7.8% of tick time) and `evaluateBatch` (no evidence)
  is the right call, and it is backed by numbers.

## Findings

### F1 (blocking): the memory store is O(n²), and the benchmark works around it instead of fixing it
`createMemoryStore`'s `prune()` runs on **every claim** and scans all records twice:
`[...records.values()].filter(...)` for retention, then `[...records.keys()].slice(...)` for the
cap. Measured on this machine, with only claims and the default store:

| records already stored | cost per claim |
|---:|---:|
| 2,000 | 121 µs |
| 5,000 | 293 µs |
| 10,000 | 583 µs |

Once the default cap (10,000) is reached, every claim costs ~0.6 ms. A 10k × 20 tick makes
~200k claims, which is about **2 minutes of claims per tick**, longer than the minute the
tick has. The benchmark sets `maxRecords: 1` ("avoiding an artificial O(N²) retention
scan"), so the published numbers describe a configuration no user runs, and the real
bottleneck goes unreported. This is my bug from Stage C2, but Stage F is the stage that
should surface it.

**Fix (simple, O(1) amortized per claim):** `Map` iterates in insertion order. Prune by
walking from the oldest entry and stop at the first record inside the retention window.
Enforce the cap by deleting `records.keys().next().value` while `size > maxRecords`. Records
inserted out of `scheduledAt` order may linger slightly longer, but they are still bounded
by `maxRecords`; document that. Add a test that fails on the old behavior, for example a
claim-cost check that stays flat as record count grows, or a count of iterations over a
large store.
Then **remove `maxRecords: 1` from the benchmark** so it measures the default store, and
re-record the AFTER numbers.

### F2 (simplify): eight positional parameters threaded through `tick.js`
`evaluateSubject(engine, tick, window, logger, task, participant, timeZone, occurrenceMemo)`
and its callers now pass the same five per-tick values through four functions. Bundle
them once per tick into a frozen `tickContext = { engine, tick, window, logger, occurrenceMemo }`
and pass `(tickContext, task, participant, timeZone)`. That is a readability change only,
with no behavior change.

### F3 (simplify): `occurrenceMemo` is optional only for tests
`findDueOccurrences` accepts an optional memo, validates it, and falls back to a new `Map`.
Its only production caller always passes one. Make it required, and have the tests pass
`new Map()`. That removes a guard branch and an untaken path. `schedule.js` is internal, so
this is not a public API change.

### Not requested
No batched writes, no `evaluateBatch`, and no worker threads. The numbers do not justify
them.

## Requested from Codex (run 1 response)
Integrate F1–F3, or push back with evidence. Re-run the benchmark with the default memory
store and report BEFORE (c39ae8f with `maxRecords` default) versus AFTER. Keep 100% coverage and all
checks green. Record the response in `docs/stage-f-review/run-1-codex-response.md` and
commit locally.
