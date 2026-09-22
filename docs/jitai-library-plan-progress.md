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
Runs 3–5 were self-critiqued (Codex unavailable). Recommend one independent Codex pass on
v6 after the usage limit resets (Codex reported reset at 6:52 PM local).
