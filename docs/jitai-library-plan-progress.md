# JITAI Library Plan — Progress Log

Process requested 2026-09-22: Claude assesses `refactor-1` + `/docs`, drafts a plan to
continue refactoring toward an open-source JITAI library; Codex critiques; Claude pushes
back and integrates; 5 runs; Claude presents the final plan. **No code changes.**
Coordination: Orca orchestration (Codex worker, supervised; auto-approved mode).
**Change of plan (Run 3):** Codex hit its usage limit mid-Run 3. At the user's request,
Claude took the critic role for Runs 3–5 (the Orca dispatch was abandoned; the Codex tab was left open).

| Run | Codex critique | Claude response | Plan version | Status |
|-----|----------------|-----------------|--------------|--------|
| 0 | — | Assessment + draft | v1 | done |
| 1 | [critique](jitai-library-plan-review/run-1-codex-critique.md) (5/10) | [response](jitai-library-plan-review/run-1-claude-response.md) | v2 | done |
| 2 | [critique](jitai-library-plan-review/run-2-codex-critique.md) (7/10) | [response](jitai-library-plan-review/run-2-claude-response.md) | v3 | done |
| 3 | [critique](jitai-library-plan-review/run-3-critique.md) (7/10, **Claude as critic**) | [response](jitai-library-plan-review/run-3-claude-response.md) | v4 | done |
| 4 | [critique](jitai-library-plan-review/run-4-critique.md) (8/10, Claude as critic) | [response](jitai-library-plan-review/run-4-claude-response.md) | v5 | done |
| 5 | [critique](jitai-library-plan-review/run-5-critique.md) (9/10, Claude as critic) | [response](jitai-library-plan-review/run-5-claude-response.md) | **v6 FINAL** | done |
| 6 | [review](jitai-library-plan-review/run-6-claude-review.md) (Claude, post-final) | + user decision | **v6.1** | done |

## Run 0 — Assessment and draft v1 (Claude)
- Verified: 19 suites / 88 tests pass; CI workflow exists (jest, `next build`, 5 s boot).
- Key new findings: `time-engine → helper → database → Prisma` chain;
  `helper ↔ database` cycle; `TimeEngine.start()` clobbers injected functions; missing
  `GeneralUtility` import in `TimeEngine.js`; static singleton state; scheduler lacks
  re-entrancy guard / missed-tick policy; `engine.mjs` broken import; no `exports` maps.
- Draft v1 reorders work: core decoupling first; stop full `DatabaseUtility` extraction.

## Run 1 — Codex critique of v1 → v2
- Codex score 5/10. Confirmed findings 1–3, 5, 6, 8, 9, 11; partial on 4, 7, 10.
- New defects (verified by Claude): undeclared `datetime` in `checkOneConditionForUser`
  (every condition throws); actions not awaited. Claude added: inconsistent action plugin
  shape (instance vs static class).
- Accepted: correctness-gate Stage A, calendar semantics, thin-core slice, 3 publishable
  packages, packed-tarball acceptance, non-gating benchmarks.
- Pushed back: transactional outbox / provider idempotency not in v1 core (claim-before-act
  per `decisionId` instead); legacy façade keeps default resolver and `preActivationLogging`
  behavior (deprecate, don't break).
- Orca note: first Codex launch blocked on a "try new model" prompt; Claude chose
  "Use existing model" (no config change) and retried on the same terminal.

## Run 2 — Codex critique of v2 → v3
- Codex score 7/10. Caught a real error in v2: `GeneralUtility.getLocalTime` does not
  exist, so "add the import" was not a fix (verified by Claude).
- Accepted: Luxon-based legacy resolver + tests; decision state machine
  (claimed/completed/failed, at-most-once, no auto-retry); scheduled-occurrence
  enumeration; discriminated Condition/Action results; opaque participants
  (`{id, timeZone}`), groups as a condition, `"system"` scope; backpressure; per-subpath
  packed import tests; delete old executor at the façade cutover.
- Pushed back: no durable watermark (bounded catch-up window + idempotent claim suffices);
  `taskVersion` derived from a content hash (no versioning workflow); no leases in v1;
  plugin `validate()` instead of JSON Schema/ajv in core; new `decision` collection instead
  of migrating `taskLog`; no compat shims if packages were never published.

## Run 3: Critique of v3 → v4 (Claude as critic; Codex unavailable)
- Codex reached the npm lookup (network error in its sandbox), then hit its usage limit. The Orca
  dispatch `ctx_8f223466c3dc` was stopped (`stop_unknown`, terminal user-owned) and then
  abandoned; no reclaimable workers remain.
- New verified defects: `cron.js` calls nonexistent
  `TaskExecutor.executeTaskForUserListForDatetime` (production cron path throws at runtime;
  CI only builds). Nothing is published on npm (E404).
- Critic found a duplicate-delivery hole in v3's identity key (`taskVersion` inside
  `decisionId`). Fixed in v4: key on `checkpointId` + scheduled instant; version is recorded only.
- Accepted: missed-window event, task-spec ADR (§3.6), `storage` bundle + static tasks,
  `tick()` first-class, npm scope claimed early, D/E ordering fix, RFC 8785 dropped.
- Author pushback: quarantine fitbit-break in `contrib/legacy` and write storage-prisma
  fresh (validated by `examples/prisma`), with live-study migration as optional D′.
  Only the non-overlap/pagination parts of perf are folded into C. `evaluateBatch` is
  reserved in docs only.

## Run 4: Critique of v4 → v5 (Claude as critic)
- Consistency pass found 5 contradictions (stale diagram, missing `recordGap` in ports
  table, `fromLegacyPlugin` location, resolver check timing, take-a-break migration
  point). All fixed.
- Design flaws fixed: eligibility vs. availability split (reverses Run 2's
  group-as-condition; avoids about 10k records per occurrence for small arms);
  reproducible randomization (`seed = HMAC(salt, decisionId)`); explicit claim order +
  `unavailable` state; `storage-prisma` with injected client + schema fragments, SQLite in CI.
- Author pushback: per-zone occurrence memoization waits until Stage F (C only makes the
  function pure); no eligibility push-down in the participants port for v1.

## Run 5: Final critique of v5 → v6 FINAL (Claude as critic)
- Behavior bug caught: `"system"` tasks evaluated in UTC would shift take-a-break's
  weekday cron. Fixed: system tasks require `timeZone`.
- Accepted: bounded memory store (retention window + `maxRecords`), `logUnavailable` defined
  as an opt-out, runner-agnostic conformance suite, Stage C split into C1 pure kernel + C2 engine,
  leftovers (`test_script/`, characterization tests) assigned to `contrib/legacy`,
  `refactor-plan.md` superseded banner, CITATION.cff in G, Stage A deprecation warning
  dropped.
- Author pushback: no numeric scale target in the plan; G publishes the measured envelope.
- **Outcome:** `docs/jitai-library-plan.md` marked FINAL (v6). No source code was changed.

## Caveat
Runs 3–5 were self-critiqued (Codex unavailable).

## Run 6: User decision + post-final review → v6.1 (Claude, user-requested)
- User: the fitbit-break study is not running, and no near-term features are planned.
- Stage A dropped (it only fixed code headed for quarantine); D′ not planned; the fitbit-break
  app itself moves to `contrib/legacy` with a known-defects README.
- Verified a CI flake: the take-a-break smoke exits 1 when its 5 s window crosses a minute
  boundary (Prisma write → unhandled rejection). One-line CI fix ships with Stage B.
- Next: **Stage B** (ADRs + fixtures + CI flake fix; npm scope is a user action).

## Stage B: Contract (2026-09-22)
- Wrote ADRs 0001–0007 (`docs/adr/`) and 4 fixture files (`docs/adr/fixtures/`):
  - 14 calendar occurrence cases + 7 invalid checkpoints + 8 zones;
  - identity/version/seed/arm goldens;
  - 24 task-spec validation cases;
  - 18 engine scenarios.
- Verified library behavior the contract relies on: cron-parser 5.0.6 + Luxon 3.6.0 shift
  DST-gap times forward and fire folded times once. Luxon accepts `+05:00` as a zone, so
  the ADR adds a name-pattern check.
- Findings while specifying: legacy cron ran in the server's zone; a weekday mismatch on
  one legacy `spec` checkpoint skipped the remaining checkpoints; legacy
  `checkPoints.enabled:false` meant "every minute"; the legacy condition path never ran,
  so the ADR records intended, not observed, semantics.
- CI: take-a-break smoke now waits until second ≤ 50 (fixes the verified ~1-in-12 flake).
- Open: `@time-fit` npm scope (maintainer action; fallback names in ADR 0007).
- Next: Stage C1 (pure kernel) against these fixtures.

## Stage C1: Pure kernel (2026-09-22)
- New `packages/core` (`@time-fit/core`, `private: true` until Stage G). Modules: `result`,
  `timeZone`, `canonicalJson`, `identity`, `randomization`, `checkpoint`, `eligibility`,
  `precondition`, `outcomes`, `pluginParams`, `taskSpec`; public entry `src/index.js`.
- Fixtures moved from `docs/adr/fixtures/` to `packages/core/__test__/fixtures/`. All 14
  calendar cases, 7 invalid checkpoints, 8 zones, the identity/seed/arm goldens, and all 24
  validation cases pass. Full repo suite: 26 suites / 294 tests.
- Coverage 100% (statements, branches, functions, lines), enforced by the core jest
  config and a CI step.
- CI: `scripts/check-core-dependencies.mjs` fails on any core runtime dependency outside
  {cron-parser, luxon, seedrandom} **and** on any bare import in `src/` outside that set.
  The source scan closes the yarn-hoisting gap.
- Bugs caught while implementing: `Date.parse` accepts Feb 30 (switched to Luxon); a
  realm-dependent plain-object check broke under Jest's VM (now checks prototype shape);
  an early draft of the dependency check matched "active-from" in a comment (now anchored
  to import statements).
- Clarifications recorded as ADR 0008.
- Next: Stage C2 (engine, memory store, conformance suite) against `engine-scenarios.json`.

## Stage C2: Engine (2026-09-22)
- `packages/core/src/engine/`:
  - `config`: validates everything up front, and `EngineConfigError` lists every problem;
  - `tick`: window, missed-window gaps, task loading, paged participants with bounded concurrency;
  - `schedule`: due occurrences plus preference resolution;
  - `decision`: the eligibility → availability → claim → execute → complete/fail pipeline;
  - `plugins`: timeout, `AbortSignal`, throw containment, 8 KB payload cap;
  - `logging`: correlation-bound, failure-proof logger;
  - `createTimeEngine`: `tick` / `start` / `stop`, no globals.
- Built-in `time-window` condition. `@time-fit/core/memory` (bounded retention) and
  `@time-fit/core/testing` (10 runner-agnostic conformance checks).
- All 18 engine scenarios pass (two engines ticking at once deliver once; edit
  mid-window does not re-send; missed windows are recorded; Detroit weekday cron fires on
  Friday evening). A throwaway sanity test confirmed the harness observes real state.
- 318 core tests at 100% coverage; full repo suite passes. The packed-tarball quickstart
  passes locally (real `npm install` into an empty directory).
- Bugs caught while implementing: a non-array `conditions` crashed config validation with
  a raw TypeError (it now reports `invalid-conditions`); an aborted tick dropped counts for
  work already done (they are kept now). Two branches that could never run were removed:
  the timer re-arm guard and `unref?.`.
- Clarifications recorded as ADR 0009.
- Next: Stage D (quarantine legacy into `contrib/legacy`, fresh `@time-fit/storage-prisma`)
  and Stage E (integrations; take-a-break moves to core). These can run in parallel.

## CI finding (2026-09-22)
- **CI has never passed on `refactor-1`.** Every run, starting at `dea7be2` before this
  session, failed because CI never ran `prisma generate`: `@prisma/client` throws at import
  until a client is generated, and developer machines already had one. The refactor plan's
  earlier "CI green" status was true locally only.
- Fix: a `yarn prisma generate --schema prisma/schema.prisma` step in the test and both
  smoke jobs. The root schema is the one the local client (and so the passing tests) was
  generated from; `apps/fitbit-break/prisma/schema.prisma` is an older, divergent copy that
  Stage D quarantines.
- Result on push (`4737a9c`): both smoke jobs and the packed-quickstart job passed, and
  Test reached 405/406. The last failure was the legacy `checkpoint-cron` test, which passes
  only when the machine's zone is New York: the legacy executor evaluates cron in the
  server's zone (ADR 0006 legacy defect #1), and CI runs in UTC. Per the decision not to fix
  legacy code, the root `yarn test` script pins `TZ=America/New_York`. The `@time-fit/core`
  coverage step still runs in CI's native UTC, and core also passes under Asia/Tokyo.

## Stage D: Legacy quarantine + fresh Prisma adapter (2026-09-22)

- Moved the inactive Walk-to-Joy / fitbit-break app, its eleven legacy packages,
  `test_script/`, and the Mongo Prisma schema to `contrib/legacy/` with `git mv`. All moved
  packages are private workspaces; root Jest, CI Prisma generation, and the fitbit-break build
  now target their new locations while take-a-break continues to import the legacy package
  names unchanged.
- Built private `@time-fit/storage-prisma`: injected-client participant/task/decision-log
  ports, same-token atomic claim behavior, claimed-only terminal transitions, optional gaps,
  SQLite/Postgres fragments, and a packed SQLite example. `yarn test` passes 31 suites / 422
  tests; core coverage passes 11 suites / 318 tests and storage-prisma runs all 10 core
  decision-log conformance checks plus 6 adapter tests (16 total) at 100% coverage. The packed
  verifier now installs both tarballs into empty directories.
- Added dependency-cruiser boundaries and generalized runtime-dependency scanning for core and
  storage-prisma. The intentional deviation is that dependency-cruiser excludes
  `contrib/legacy` from the no-cycle scan: its helper/database cycle is a preserved known
  legacy defect, while packages are prohibited from importing contrib; this is documented in
  ADR 0010. No legacy defects were fixed; the README records undefined `datetime`, unawaited
  actions, missing `GeneralUtility.getLocalTime`, broken cron method, and server-zone cron.
