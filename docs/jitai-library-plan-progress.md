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

## Stage E: Integrations + database-free take-a-break (2026-09-22)

- Added private `@time-fit/integrations` with subpath-only `desktop`, `twilio`, and `mailjet`
  Action factories. Every provider client is injected, no integration reads environment
  variables or imports a vendor SDK, Mailjet receives `decisionId` as `CustomID`, and missing
  participant destinations/provider failures become typed ActionResults.
- Moved `apps/take-a-break` to core memory storage and a system-scope `America/Detroit` task.
  The CI smoke now executes one fixed core tick with a fake notifier; it has no Prisma setup,
  timer race, or minute-boundary workaround. Root `yarn test` passes 32 suites / 433 tests;
  coverage passes core 11 suites / 318 tests, storage-prisma 1 suite / 16 tests, and
  integrations 1 suite / 11 tests, all at 100%.
- The packed verifier installs core + integrations without Twilio, Mailjet, or node-notifier
  and imports/runs only desktop with an injected fake. The deliberate deviation is no optional
  vendor peer dependency: because the package imports no SDK, declaring one would force an
  unnecessary dependency contract; this and Twilio's lack of a safe idempotency field are
  documented in ADR 0011. No new core or legacy bug was found or changed; next is Stage F.

## Stage F: implementation (run 0)

- Added a report-only core benchmark over 1,000 × 5 and 10,000 × 20 participant-task grids
  with memory storage, no-op actions, cron/fixed-time checkpoints, zones, and preconditions.
  On macOS 26.6.2 arm64 / Node v26.4.0, the 10,000 × 20 case improved from 7,365 to 65,650
  decisions/sec at concurrency 1 and from 7,432 to 76,487 decisions/sec at concurrency 8.
- Added per-tick memoization for cron and fixed-time occurrence enumeration keyed by task
  version, checkpoint id, zone, and exact window; preference checkpoints deliberately remain
  per participant. All 18 engine fixtures now run at concurrency 1 and 3, with focused tests
  covering ordering, no duplicate participant processing, and bounded page/action work.
- Skipped optional unavailable-record batching: terminal unavailable claims measured 239.0 ms
  (7.8%) of the optimized 10,000 × 20 concurrency-1 tick, while claimed records cannot be
  batched before actions. `Condition.evaluateBatch` remains reserved because no realistic
  DB-backed condition benchmark established it as a bottleneck; details are in
  `docs/stage-f-review/run-0-codex-implementation.md`.

- **Stage F review run 1:** integrated insertion-order memory pruning after the default store
  measured 862.7 decisions/sec and 231.8 s/tick at 10,000 × 20; it now measures 32,115
  decisions/sec and 6.23 s/tick. The benchmark uses the default 10,000-record cap, tick state
  is bundled into an immutable context, and the internal occurrence memo is required; the
  corrected before/after table and evidence are in `docs/stage-f-review/run-1-codex-response.md`.

- **Stage F review run 2:** the report-only benchmark now uses one warm-up plus the median of
  three fresh-engine samples and includes a 1 ms simulated decision-log I/O case. With an
  I/O-bound adapter, throughput scales roughly with concurrency until the database saturates;
  start at 8 and tune for the deployment, while the ADR 0005 default remains 1. The 1,000 × 5
  latency case improved from 407.7 decisions/sec at concurrency 1 to 2,713.0 at 8 and 6,987.7
  at 32; details are in `docs/stage-f-review/run-2-codex-response.md`.

- **Stage F review run 3:** a 50-participant × 2-task engine tick against the real Prisma
  SQLite adapter completes all 100 decisions at concurrency 8 without claim or finalize
  failures. Benchmark call-time columns now state that they sum overlapping calls, and
  deployments using concurrency should keep `pageSize` several times larger than concurrency
  (for example, `pageSize >= 4 × concurrency`) to reduce underfilled final page waves without
  prefetching; details are in `docs/stage-f-review/run-3-codex-response.md`.

- **Stage F review run 4:** `EngineOptions` now documents the deployment guidance to start
  I/O-bound adapters at concurrency 8 and keep `pageSize >= 4 × concurrency`, while retaining
  the ADR 0005 defaults. The Stage F status block now records the built work, measured declined
  scope, headline measurements, and Stage G README follow-up; details are in
  `docs/stage-f-review/run-4-codex-response.md`.

- **Stage F review run 5:** clarified that the JSDoc benchmark evidence path is repository-only,
  added the review index, and changed the plan status to done. Stage F is done; Stage G is next,
  starting with publishing the measured envelope in the README; details are in
  `docs/stage-f-review/run-5-codex-response.md`.

## Docs cleanup: legacy examples (2026-09-28)
- The fitbit-break walkthroughs (`examples/example2.md`, `example2-brief.md`) moved to
  `contrib/legacy/fitbit-break/docs/` (`fitbit-step-nudge*.md`) with a "legacy, frozen"
  banner; they describe the quarantined engine and do not run as written.
- `examples/example1.md` was rewritten for the current API (`createTimeEngine`, memory store,
  `/desktop` action, system task with `timeZone`). Its code was executed with a fake notifier:
  one decision completed, one notification sent.
- The root README's MongoDB/Fitbit/Mailjet/Twilio setup moved verbatim to
  `contrib/legacy/fitbit-break/docs/setup.md`. The README now has a short current "Getting
  started", a package table, and an examples list; the project description no longer mentions
  Fitbit. The full library-first README is still Stage G.
- Removed two broken root scripts: `index` (`./src/index.js` does not exist) and `example2`
  (`contrib/legacy/fitbit-break/index.js` does not exist).
- **License resolved (owner decision, 2026-09-28): BSD 3-Clause**, matching `LICENSE.txt`
  (© 2025 The Regents of the University of Michigan). All 17 tracked `package.json` files now
  declare `BSD-3-Clause` (previously MIT, or unset for two private packages). Each publishable
  package ships a `LICENSE` copy. Recorded in ADR 0012, which supersedes ADR 0007's MIT item.
- **Observed once:** one root `yarn test` run failed 17 tests (the size of the storage-prisma
  suite). Four reruns passed, and the failure was not reproduced. The likely cause is that
  suite's test-time `prisma generate`/`db push` setup; worth hardening in Stage G.

## Stage G section 1: implementation (run 0)

- Reproduced the storage-prisma failure with two concurrent coverage runs: both used the same
  SQLite file, one run observed zero persisted engine decisions while the other reported
  SQLite "attempt to write a readonly database" errors. Tests now use a unique OS-temp
  database directory and an explicit Prisma datasource URL; `db push` receives that URL only
  in its child-process environment, so Jest's `process.env` is not modified.
- Added a schema-and-Prisma-version keyed generated-client guard, protected by a temporary
  cross-process lock. Root and package test commands invoke it before Jest, so a clean checkout
  generates the client once while normal reruns reuse it; two concurrent coverage runs now
  pass all 18 storage-prisma tests independently at 100% coverage. A no-generated-client root
  run generated before Jest and then passed 32 suites / 458 tests.
- Dependabot's current default-branch counts are 147 removed `package-lock.json` alerts, 143
  `yarn.lock` alerts, and 52 stale fitbit-break-manifest alerts. Production recursive audits
  for all three publishable packages found zero advisories; of the 143 lock alerts, 111 have a
  legacy/non-publishable path but none through a published package, 29 are shared dev tooling,
  and 3 no longer resolve on `refactor-1`.
  The full evidence and recommendation are in
  [`stage-g-review/run-0-codex-implementation.md`](stage-g-review/run-0-codex-implementation.md).

- **Stage G section 1 review run 1:** replaced the generated-client cache and cross-process
  lock with Prisma's direct generation command after repeated concurrent generation and
  coverage runs passed with the isolated SQLite database. Recorded the accepted legacy advisory
  policy in `contrib/legacy/README.md`, evaluated the shared development-tooling fixes, and
  documented every decision in `docs/stage-g-review/run-1-codex-response.md`.
- Round 2 (implemented by Claude; Codex was at its usage limit): lockfile-only refreshes moved
  8 of 9 shared dev-tooling families to patched versions. `tar` 6.2.1 remains, pinned only by
  legacy `bcrypt@5`, and is accepted. All checks are green, and the production audits of the
  three publishable packages are clean.
- Round 3 (final review by Claude): section 1 approved. Codex could not take rounds 2–3
  (usage limit), so an independent Codex pass is recommended before release. Section 1 is done;
  sections 2–5 remain.

## Stage G section 3: implementation (run 0)

- Added concise contribution, conduct, security, and governance policies; the conduct policy is
  Contributor Covenant 2.1 with GitHub-only reporting and no published email address.
- Added short bug, feature, security-routing, and pull-request templates, and linked the new
  policies from the root README.
- Recorded that the owner must enable GitHub private vulnerability reporting in repository
  settings; the release-report details are in
  [`stage-g-review/section-3-run-0-codex-implementation.md`](stage-g-review/section-3-run-0-codex-implementation.md).

- **Stage G section 3 review run 1:** added the CI-required legacy Prisma generation step to
  `CONTRIBUTING.md`, made the Covenant source-faithful, and clarified that its private GitHub
  reporting form also accepts conduct reports. The separate GitHub-content-report suggestion
  was declined because the owner required verbatim Covenant text except for the contact
  placeholder; see
  [`stage-g-review/section-3-run-1-codex-response.md`](stage-g-review/section-3-run-1-codex-response.md).

- **Stage G section 3 review run 2:** added a one-line private-security-reporting notice to
  the direct bug-report template, closing the path that bypasses the issue chooser's security
  contact link; see
  [`stage-g-review/section-3-run-2-codex-response.md`](stage-g-review/section-3-run-2-codex-response.md).

- **Stage G section 3 review run 3:** Claude approved the policy-file bundle with no further
  content changes. Section 3 is done; the owner must enable **Settings → Security → Private
  vulnerability reporting** before the links in `SECURITY.md`, `CODE_OF_CONDUCT.md`, and the
  issue chooser are available. See
  [`stage-g-review/section-3-run-3-codex-response.md`](stage-g-review/section-3-run-3-codex-response.md).

## Repository home (2026-09-29)
- Owner decision: the project stays under `github.com/peiyaoh/time-fit` (option A). The old
  name `MIACollaborative/time-fit` redirects to it. The citation URLs in `CITATION.cff` and
  `README.md` now use the canonical address; the license copyright holder (University of
  Michigan / MIA Collaborative) is unchanged. Private vulnerability reporting was enabled on
  the repository at the owner's request (`{"enabled": true}`).

## Stage G sections 2 and 4: implementation (run 0)

- Added library-first root and core package documentation, delivery guarantees, privacy guidance,
  links to ADRs and examples, Stage F's measured envelope, and an honest BSD-3-Clause citation
  without an invented release version or date.
- Added generated JSDoc declarations to packed artifacts for all public entry points; the packed
  fixture asserts declaration files and compiles TypeScript imports for core, memory, testing,
  Prisma storage, and every integration subpath. Generated declarations are ignored and removed
  after packing.
- Added Node 20/22/24 test matrix, Changesets configured to ignore root/app/frozen legacy
  workspaces, grouped weekly Dependabot updates, and a BSD-compatible direct production/peer
  dependency license check. Publish remains deferred to Stage G section 5: candidates are still
  `private: true`, so the packed-tarball verification is the release-content check.

- **Stage G sections 2 and 4 review run 1:** added package repository/homepage/bug metadata,
  corrected Changesets release defaults and citation metadata, and tightened privacy and
  Dependabot wording. All five review findings integrated; details are in
  `stage-g-review/sections-2-4-run-1-codex-response.md`.

- **Stage G sections 2 and 4 review run 2:** added an honest pre-release install path and
  replaced internal stage names in user-facing benchmark language. Both findings integrated;
  details are in `stage-g-review/sections-2-4-run-2-codex-response.md`.

- **Stage G sections 2 and 4 review run 3:** final review approved sections 2 and 4. Close-out
  records the review index and leaves section 5's owner release decisions; the Node 22/24 matrix
  is first verified by CI on push. Details are in
  `stage-g-review/sections-2-4-run-3-codex-response.md`.

## Release checklist (2026-10-02)
- Section 5's remaining owner steps are written up in `docs/release-checklist.md`: npm scope,
  merging PR #30, the first version via Changesets, flipping `private`, the publish dry run,
  provenance, publishing, and post-release follow-ups.
- Checking the release commands found two packaging defects, both fixed:
  - `yarn pack` / `yarn npm publish` failed at `prepack` with `command not found: tsc`, because
    `typescript` was a root-only devDependency and Yarn runs workspace scripts with only that
    workspace's binaries. `npm pack` (used by the packed verification) masked it. Each
    publishable package now declares `typescript` as a devDependency.
  - The unanchored `files` entry `README.md` matched `packages/core/__test__/fixtures/README.md`;
    `README.md` and `LICENSE` are now anchored (`/README.md`, `/LICENSE`) in all three packages.
  - All checks pass: 458 root tests, dependency/license/depcruise checks, and 6/6 packed checks.
