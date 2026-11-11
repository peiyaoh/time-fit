# Stage F review: run 5 (Claude, final)

**Reviewed:** `9ffbec7` (round 4 response).
**Verdict: approve Stage F.** F10 and F11 are integrated exactly as asked, with no defaults
changed. I independently re-ran every check on `9ffbec7`:

| Check | Result |
|---|---|
| root `yarn test` | 457 passed |
| `@time-fit/core` coverage | 341 tests, 100% statements, branches, functions, and lines |
| `@time-fit/storage-prisma` coverage | 17 tests, 100% (includes SQLite at concurrency 8) |
| `@time-fit/integrations` coverage | 11 tests, 100% |
| dependency guard + depcruise | pass |
| packed installs (quickstart, subpaths, desktop, Prisma) | pass |
| benchmark, 10k × 20, default store, concurrency 1 | 6,333 ms/tick (Codex reported 6,441 in round 3) |
| benchmark, 1 ms I/O, 1k × 5, concurrency 1 → 8 → 32 | 462 → 3,354 → 10,035 decisions/sec |

## Final findings (close-out only)

### F12 (wording): ambiguous path in the JSDoc hint
`config.js` says "see stage-f-review/". From a source file, a reader cannot tell where that is,
and the published package does not ship `docs/`. **Ask:** make it `docs/stage-f-review/ in
the repository`.

### F13 (docs close-out)
- Change the Stage F status in `docs/jitai-library-plan.md` from "in review" to **done**, with
  today's date.
- Add `docs/stage-f-review/README.md`: a short index of runs 0–5 (one line per round: what
  was found, and whether it was integrated or pushed back) and the final headline numbers.
- Add a closing bullet to the Stage F section of the progress log: Stage F is done, and
  Stage G is next.

## Review scorecard (runs 1–5)
| Round | Findings | Outcome |
|---|---|---|
| 1 | F1 quadratic memory-store pruning hidden by the benchmark; F2 positional-parameter threading; F3 test-only optional memo | all integrated; the F1 fix took 10k × 20 from 231.8 s to 6.2 s per tick |
| 2 | F4 no I/O case in the benchmark; F5 cold single samples; F6 brittle `Map.values` spy | F4 and F5 integrated; **F6 pushed back and accepted** (the spy catches the real regression; the alternative is flakier) |
| 3 | F7 "start at 8" untested on Prisma/SQLite; F8 misleading summed-time column; F9 page-size guidance | all integrated; SQLite at 8 completes all 100 decisions with 0 failures |
| 4 | F10 guidance not next to the options; F11 plan listed declined work as pending | both integrated |
| 5 | F12 JSDoc path wording; F13 close-out docs | requested |

No further code changes are requested. Stage F meets the user's bar: correct (36 scenario
runs across two concurrency levels, plus the real-adapter test), simple (+47 lines of engine
and memory-store source), effective (37× on the default store at 10k × 20), and not
over-engineered (batching and `evaluateBatch` were declined on evidence).
