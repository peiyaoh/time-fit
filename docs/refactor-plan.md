# time-fit Refactor Plan

_Produced via 5 rounds of Claude draft ↔ Codex-style adversarial critique (Phase 1),
followed by a second 5-round pass where Codex reviewed Stage 1's proposed solutions against
alternatives and Claude critiqued/pushed back (Phase 2) — both phases verified directly
against the `refactor-1` branch. Phase 2 verdict: no showstoppers, Stage 1 text finalized._

## Current state assessment

- Broken relative imports in `fitbit-integration` resolve outside the repo entirely
  (`../../../helper/*` → `/Users/peiyaoh/Code/helper/...`, confirmed via a direct
  `node --experimental-vm-modules` import that throws `Cannot find module`).
  `packages/index.js` imports a non-existent `./data-source/fitbit/...` path and is itself
  dead demo code (hardcoded inline task list).
- Two distinct coupling defects, both confirmed by grep:
  - Relative cross-package imports (`../helper/*`) in `time-engine`, `action-collection`,
    `condition-collection`. (An earlier draft of this plan misclassified `time-engine`'s
    case as a "phantom specifier" bug — corrected: it's a relative-import bug, same class
    as `fitbit-integration`'s.)
  - **Phantom package-specifier imports**: `api-handlers`, `database`, `web-components`,
    `action-collection`, `app-utils` already `import ... from
    "@time-fit/helper/..."` with **zero corresponding `@time-fit/helper` entry** in that
    package's `dependencies`. This "works" today only because yarn hoists `@time-fit/helper`
    into the shared root `node_modules` — it will silently break under stricter
    workspace/hoisting configs or once `@time-fit/helper` is version-pinned instead of
    `workspace:*`.
  - **`apps/fitbit-break/pages/api/cron.js` — the app's actual scheduled-task entry point —
    imports four nonexistent local files** (`../../lib/prisma`, `../../lib/TaskExecutor.mjs`,
    `../../lib/GeneralUtility.mjs`, `../../lib/DatabaseUtility.mjs`; `lib/` only contains
    `AppHelper.js` and `logger.js`). This is a live, currently-broken production entry
    point, not just an internal inconsistency.
  - **Duplicate `TaskExecutor` implementations**: `packages/time-engine/TaskExecutor.js`
    (528 lines, live, wired into `TimeEngine.js`, exercised by `apps/take-a-break`) vs.
    `packages/task-management/TaskExecutor.js` (356 lines, zero confirmed callers anywhere
    in the repo). The entire `packages/task-management` package, in fact, has zero
    confirmed callers for any of its five exports — it's dead code carried along by an
    unused `workspace:*` dependency in `apps/fitbit-break/package.json`.
  - `action-collection/package.json` has no `dependencies` block at all despite
    `HelloAction.js`/`NoAction.js` directly importing `seedrandom`.
  - `action-collection`/`condition-collection` declare `"main": "index.js"` but no such
    file exists in either package.
  - Three files in `condition-collection/others/` are untracked by any index, unexported,
    and untested — status undecided.
- `packages/database/prisma.js` is a 3-line re-export of `@time-fit/helper/prisma.js`
  (confirmed verbatim), which holds the real Prisma singleton plus a dead commented-out
  "version 1" block. The package meant to own persistence doesn't own its own client — a
  naming trap for future maintainers.
- `DatabaseUtility.js` (960 lines, 26 Prisma call sites, concentrated in very few large
  functions, **zero existing tests**) is not a thin CRUD layer — it interleaves persistence
  with message-template substitution, survey-response aggregation, date-diffing, and
  prioritization rules. This is the highest-risk, highest-effort item in the whole plan.
- `MongoDBHelper.js` (~376 lines, confirmed) hardcodes the database name `"walk_to_joy"` at
  roughly 13 call sites — an org-specific literal baked into code being positioned as a
  reusable library.
- `TaskExecutor.js` (core `time-engine`) imports `DateTimeHelper`, `RandomizationHelper`,
  `BooleanHelper`, `ObjectHelper`, `UserInfoHelper` from `helper` by relative path (not
  `TimeZoneHelper`, which an earlier draft of this plan incorrectly named — corrected after
  a direct grep found zero references). `RandomizationHelper`'s entire usage is one call
  (`getRandomNumber()`); `DateTimeHelper` is load-bearing inside `isCheckPointForUser` and
  must not be duplicated.
- `web-components` (`DataTable`, `Layout`, `ObjectListExportToolbar`) reads as
  admin-dashboard UI, not JITAI primitives, and has a live React version conflict with its
  own consuming app: `apps/fitbit-break` pins `react@17.0.2` while `web-components`
  declares `dependencies: react@^18` (peer range covers both, but its own install would
  pull v18 into a v17 app).
- Root `package.json` carries implementation dependencies (`@prisma/client`,
  `mongodb-memory-server`, `twilio`, ...) that belong to specific packages, has no
  `license` field despite every package declaring MIT individually, and is `private: true`
  with no stated publish plan.
- No CI at all (`.github/workflows` doesn't exist) — nothing enforces `yarn test` staying
  green during the refactor. Test coverage is uneven: `action-collection`,
  `condition-collection`, `helper`, `time-engine` have jest suites; `api-handlers`,
  `app-utils`, `database` (0 tests), `mongodb-helper`, `fitbit-integration`,
  `web-components` do not. (`task-management` is excluded from this list — it's dead code
  slated for deletion, not test backfill; see Stage 1b.)
- `test_script/*.mjs` (90+ files) are ad-hoc manual scripts outside the package/CI
  boundary, referencing the pre-split module layout.
- ESM-only (`"type": "module"` at root), no TypeScript anywhere — an undecided design fork
  for a library aimed at external developers. Secrets sourcing for
  `TwilioHelper`/`MailjetHelper`/Fitbit credential helpers is unaudited. No
  versioning/changelog tooling (every package pinned at `1.0.0`/`0.1.0`). No structured
  logging/error-reporting convention anywhere in the engine or actions.

## Goal

A modular, reusable, performant library for building time-based JITAIs: installable
piecemeal (e.g. `@time-fit/time-engine` + `@time-fit/condition-collection` alone, without
Fitbit/Twilio/Prisma), with a stable versioned public API, pluggable persistence/
notification backends, and a real CI safety net — scoped and paced for a solo maintainer
and shipped as a sequence of independently mergeable PRs rather than one long-lived branch.

## Definition of done

The effort is complete when:
- Stages 1–7 below are merged to `main`.
- CI is green, including a smoke-boot job for both `apps/take-a-break` and
  `apps/fitbit-break` (including the latter's Next.js build).
- `@time-fit/time-engine` has no relative or phantom cross-package imports and is
  installable on its own without pulling in `web-components` or any app-specific plugin
  package.
- `@time-fit/database` and `@time-fit/mongodb-helper` both implement the same
  `StorageAdapter` interface, with characterization tests proving the Stage 3a extraction
  didn't change behavior.

Versioning/publishing tooling and the performance pass are explicitly **not** required for
"done" — they stay deferred until a second real consumer exists. This is the stopping
condition: don't keep adding scope after Stage 7 merges.

## Workstreams (8 stages + 2 deferred; each stage = one mergeable PR with a named deliverable)

### Stage 1 — Fix the baseline, decide defaults, stand up CI
**Deliverable:** CI green on a branch with these changes. Internally split into 1a
(correctness bugs — blocks CI going green) and 1b (mechanical cleanup, safe to land in the
same PR or a same-day follow-up commit) rather than a separate stage number, to avoid
re-inflating stage count for a solo maintainer.

**1a — Correctness fixes (the code currently throws or silently no-ops):**
- Repoint the genuinely broken relative imports in `fitbit-integration`
  (`../../../helper/*`, `../../DataRecordHelper.js`).
- Fix `apps/fitbit-break/pages/api/cron.js`, which currently imports **four nonexistent
  local files** — `../../lib/prisma`, `../../lib/TaskExecutor.mjs`,
  `../../lib/GeneralUtility.mjs`, `../../lib/DatabaseUtility.mjs` (confirmed: `lib/`
  contains only `AppHelper.js` and `logger.js`) — meaning this cron endpoint, the app's
  actual scheduled-task trigger, currently throws on every invocation. Repoint each import
  to its real package equivalent (e.g. `TaskExecutor` from `@time-fit/time-engine`, per the
  canonicalization decision below; `prisma` from `@time-fit/database`).
- Fix every phantom `@time-fit/helper` specifier import by declaring the real dependency in
  each consuming package.json: `api-handlers`, `database`, `web-components`,
  `action-collection`, `app-utils`.
- Fix `time-engine`'s relative imports of `DateTimeHelper`/`BooleanHelper`/`ObjectHelper`/
  `UserInfoHelper` from `helper` — this is an item-1-class relative-import bug (not a
  phantom-specifier bug as an earlier draft misclassified it), fixed the same way:
  declare `@time-fit/helper` as `time-engine`'s real dependency for these.
- **Resolve the duplicate `TaskExecutor` implementations.** Three copies were found:
  `packages/time-engine/TaskExecutor.js` (528 lines, live — wired into `TimeEngine.js`,
  exercised today by `apps/take-a-break`), `packages/task-management/TaskExecutor.js` (356
  lines, confirmed zero callers anywhere in the repo), and `apps/fitbit-break`'s dangling
  `../../lib/TaskExecutor.mjs` reference (doesn't exist). Canonical: `time-engine`'s
  version — it's live and matches Stage 4's already-settled design naming `time-engine` as
  the public API entry point. Diff `task-management`'s copy against it for any genuinely
  unique logic before deleting; fold in anything real, then delete
  `packages/task-management/TaskExecutor.js`.
- Add the missing `seedrandom` dependency to `action-collection`; add barrel `index.js` to
  `action-collection`/`condition-collection`.
- Decide the fate of `condition-collection/others/*` (three untracked, untested,
  unexported files): export via barrel, or delete if abandoned.
- Inline `RandomizationHelper.getRandomNumber()` directly into `time-engine` instead of
  depending on all of `helper` for one call.
- Resolve the `database/prisma.js` vs. `helper/prisma.js` duplication:
  `@time-fit/database` owns the real Prisma client going forward; `helper/prisma.js` is
  **fully deleted** (not left as a re-export — no external consumer exists yet, and
  `fitbit-integration`'s relative import to it is already being repointed above).
- Move root-level implementation dependencies (`@prisma/client`, `mongodb-memory-server`,
  `twilio`, etc.) down into the packages that actually use them; root keeps only shared
  devDependencies/tooling.
- Decide and record: ESM-only (default), JS + JSDoc over TypeScript (default), root
  `license: MIT` and drop `private`.
- Define the shape of a minimal pluggable logging/error-reporting interface as a JSDoc
  typedef only — no rewrite of existing `console.*` call sites yet, that's enforced
  starting Stage 3b/5. Keeps this stage scoped to "fix," not "redesign."
- Stand up CI: `yarn test` across every package, plus a smoke-boot job for both sample
  apps. The smoke job must actually invoke `apps/fitbit-break`'s `/api/cron` handler (not
  just confirm the Next.js process boots — a broken dynamic import inside an API route can
  pass a bare boot check silently) — this is what would have caught the cron.js bug above.
  This job must stay green through every later stage.

**1b — Cleanup (mechanical, no functional bug, safe to land alongside 1a):**
- **Delete the entire `packages/task-management` package.** Beyond its dead
  `TaskExecutor.js`, every other export (`TaskHelper`, `TaskList`, `TaskLogHelper`,
  `TaskLogDisplayHelper`, `TaskGeneratorHelper`) has zero confirmed callers anywhere in the
  repo — real usage of equivalent functionality goes through `packages/helper` instead.
  Remove the `"@time-fit/task-management": "workspace:*"` dependency line from
  `apps/fitbit-break/package.json` in the same commit (it's declared but never imported —
  leaving it would break the lockfile/install once the package is gone). Drop it from Stage
  6's test-backfill scope — there's nothing left to test.
- Delete `packages/index.js` (or move it to `/examples` as a documented sample) — it's dead
  demo code importing a `data-source/fitbit/...` path that doesn't exist.
- Fix the React version conflict by moving `react`/`react-dom` in
  `web-components/package.json` from `dependencies` to peer-only (the existing
  `peerDependencies` range `^16.8||^17||^18` already covers `apps/fitbit-break`'s pinned
  `17.0.2`) — simpler and lower-risk than forcing an app-level major-version bump inside a
  baseline-fix stage.

### Stage 2 — Secrets & hardcoded-config audit
**Deliverable:** `.env.example` at repo root documenting every required credential; no
org-specific literal remains in library code.

- Confirm `TwilioHelper`, `MailjetHelper`, and Fitbit credential helpers source secrets
  from environment variables.
- Make `MongoDBHelper.js`'s hardcoded `"walk_to_joy"` database name a required config
  parameter — treat this as an API-shape change for every call site, and update them.

### Stage 3a — Characterize, then extract, `DatabaseUtility.js`
**Deliverable:** a jest suite under `packages/database/__test__` written first against the
*unrefactored* code (none exists today), followed by the extraction.

- Write characterization tests covering `DatabaseUtility.js`'s current behavior before
  touching it — this closes the gap where "CI stays green" would otherwise be vacuous
  against a file with zero existing tests.
- Extract the pure business logic (message-template substitution, survey-response
  aggregation, date-diffing, prioritization rules) into functions with no Prisma calls,
  keeping the characterization suite green throughout.

### Stage 3b — Design and adopt `StorageAdapter`
**Deliverable:** a single interface file (e.g. `packages/database/StorageAdapter.js`,
JSDoc typedef contract) implemented by both `@time-fit/database` (Prisma) and
`@time-fit/mongodb-helper`, using Stage 1's logging interface for adapter-level errors,
with Stage 3a's characterization tests passing against both implementations.

### Stage 4 — Define the core public API contract
**Deliverable:** a documented, versioned contract (JSDoc typedefs or equivalent) for
`registerAction`/`registerCondition`/`registerGetTaskListFunction` etc., with typed error
objects (not thrown strings) and a written deprecation policy.

- Declare `@time-fit/helper` as `time-engine`'s explicit dependency for `DateTimeHelper`
  (load-bearing, not duplicated).
- Explicitly exclude `web-components` from this contract; flag it for spin-out as a
  separate, optional UI package outside the JITAI engine's critical path.
- Keep the engine decoupled from concrete action/condition packages — wiring stays at the
  composition-root/app level, as `apps/*` already do correctly.

### Stage 5 — Extract app-specific integrations as optional plugins
**Deliverable:** `fitbit-integration` and the Twilio/Mailjet/desktop-notification actions
installable as independent packages depending only on core interfaces (never the reverse),
each accepting the Stage 1 logging interface instead of hardcoding output.

### Stage 6 — Backfill tests
**Deliverable:** jest suites for `api-handlers`, `app-utils`, `database` (beyond Stage 3a's
characterization tests), `mongodb-helper`, `fitbit-integration` matching the existing
baseline; useful `test_script/*.mjs` scripts converted to jest, the rest deleted.
(`task-management` is not included — deleted as dead code in Stage 1b.)

### Stage 7 — Documentation
**Deliverable:** per-package README with install/usage; top-level library README
(describing the library, not just the two sample apps); an API reference for the Stage 4
contract; a note on the `web-components` spin-out decision.

### Deferred until a second real consumer exists
- **Versioning & publishing tooling** (changesets, independent semver, npm publish
  pipeline) — not worth the process overhead for a currently single-maintainer,
  non-public package set.
- **Performance pass** on `TimeEngine`'s scheduling loop and `TaskExecutor`'s condition
  evaluation — deferred until there's a concrete target scale (participants × tasks ×
  checkpoints) to profile against; premature before Stages 3–4 lock the API and storage
  shape anyway.

## Stage 1 implementation status

Stage 1 (1a + 1b) has been implemented on `refactor-1` (uncommitted in the working tree,
pending review/commit). Verified results: 72/72 jest tests passing (up from the original
63, since Stage 1a's prisma consolidation initially broke, then Stage 1's later rounds
correctly restored, `TaskHelper`/`TaskLogHelper` test coverage); `apps/take-a-break` boots
cleanly with no `ERR_MODULE_NOT_FOUND`; the React/Next.js version gate blocking
`apps/fitbit-break`'s `next build` is cleared.

**One correction made mid-implementation**: Stage 1b's original instruction to delete all
of `packages/task-management` was based on a review-phase claim that every export had zero
callers. That claim was **wrong** for three files — `TaskHelper.js`, `TaskLogHelper.js`,
and `TaskGeneratorHelper.js` are genuinely imported by `packages/time-engine/TimeEngine.js`
(the plan's own designated canonical engine), and `TaskLogDisplayHelper.js` is genuinely
imported by `apps/fitbit-break/component/TaskLogTable.js`. All four were recovered from git
history into `packages/helper/` (their proper home, matching what `TimeEngine.js` already
expected) with internal `prisma.js` imports repointed to the Stage 1a consolidation. Only
`TaskExecutor.js` and `TaskList.js` were confirmed genuinely dead and stayed deleted. This
means the Phase 1/2 review process, despite five rounds of grep-based verification, still
missed two real call sites — a reminder that "zero grep hits" checks need to cover the
`apps/*` tree as thoroughly as `packages/*`, not just assume it.

**Stage 1c (completed).** The items above, plus more of the same class discovered while
verifying the fix with a real `next build` rather than trusting the smoke-boot alone:
`apps/fitbit-break/pages/{activity-summary,dashboard,display-subscription,fitbit-signin,
get-activity-summary,get-intraday,main}.js` also imported the fictional
`@time-fit/data-source/fitbit/helper/*` path or stale `../lib/*.mjs` files; four pages
(`get-activity-summary`, `get-intraday`, `refresh-token`, `group-setting`) additionally
had a broken NextAuth import (`./auth/[...nextauth]` instead of the real
`./api/auth/[...nextauth]`); `apps/fitbit-break` carried an unused, ancient direct `twilio`
dependency that was shadowing the real one via yarn hoisting; and
`packages/web-components` needed `transpilePackages` in `next.config.js` since it ships
JSX in `.js` files that Next doesn't transpile for workspace packages by default.
`TwilioHelper.js` was implemented (matching the pre-existing test spec) and its test
migrated to `jest.unstable_mockModule`, since `jest.mock()`'s CJS-style hoisting doesn't
apply under this project's native-ESM Jest config.

**Result: `apps/fitbit-break` now builds cleanly end to end (every page compiles),
`apps/take-a-break` boots cleanly, and all 18 test suites / 75 tests pass with zero
failures** — the first fully green state this codebase has had in this refactor's history.

## Sequencing & shipping rationale

1 → 2 → 3a → 3b → 4 → 5 → 6 → 7, each landing as its own PR against `main`, gated by Stage
1's CI/smoke job, so the maintainer can pause between any two stages without an
unmergeable long-lived branch. Stage 3 (a+b) is the highest-risk, highest-effort stage in
the plan — explicitly sized as disproportionate to the others — and stays split into two
PRs specifically so a partial rollback is possible if 3b's interface design needs rework.

## Provenance of this plan

- **Round 1** established the baseline defects (broken imports, phantom specifiers, no
  CI) and flagged missing risks: TypeScript/module-system decision, versioning, secrets
  audit, app-compatibility smoke testing, observability, licensing.
- **Round 2** pushed the storage-interface work deeper (found `DatabaseUtility.js` is a
  domain-logic god object, not thin CRUD), found the `database/prisma.js` vs.
  `helper/prisma.js` duplication, flagged `time-engine`'s coupling into `helper`, and
  argued the original 11-stage plan was too heavy for a solo maintainer — collapsed to 7.
- **Round 3** sized Stage 3 as disproportionately large and split it into 3a/3b, surfaced
  a live React version conflict in `web-components`, flagged `web-components` itself as
  scope creep, and required a PR-per-stage shipping strategy.
- **Round 4** corrected a factual error (this plan previously and incorrectly attributed a
  `TimeZoneHelper` dependency to `time-engine`; grep confirmed zero references — the real
  set is `DateTimeHelper`/`RandomizationHelper`/`BooleanHelper`/`ObjectHelper`/
  `UserInfoHelper`), found `packages/database` has zero existing tests (making the
  original Stage 3a safety claim vacuous, fixed via characterization-tests-first), and
  added the Definition of Done plus root `package.json` dependency cleanup.
- **Round 5** re-verified three previously-unchecked factual claims against the repo (all
  confirmed exact), found no showstoppers, and rated the plan 9/10 — ready to ship as
  final.

### Phase 2 — Stage 1 solution review (5 rounds, no code changes)

Requested separately: Codex reviews Stage 1's specific line items, enumerates alternative
solutions for each, and compares them on correctness/simplicity/effectiveness/performance/
over-engineering; Claude critiques the review each round.

- **Round 1** confirmed all 11 original Stage 1 items against the repo and found the
  chosen solution was already best for 9 of them (no viable alternative beat: fixing
  broken imports as specifier+dependency, inlining the one-call `RandomizationHelper`
  usage, adding the missing `seedrandom` dep, standing up CI). Found two new defects:
  `time-engine`'s helper imports were misclassified as "phantom specifier" bugs (they're
  relative-import bugs); and a previously-undocumented duplicate `TaskExecutor.js` exists
  in both `time-engine` and `task-management` with no stated canonical version. Proposed
  the React version conflict be fixed by moving `react`/`react-dom` to peer-only
  dependencies in `web-components` rather than forcing a major-version bump on
  `apps/fitbit-break` — a simpler, lower-risk alternative than the plan's original wording.
- **Round 2** — Claude surfaced that `apps/fitbit-break/pages/api/cron.js` (the app's real
  scheduled-task entry point) imports a nonexistent local file, escalating the
  TaskExecutor-duplication question from "which is canonical" to "there's also a live
  broken production endpoint." Codex confirmed this and recommended folding the fix into
  Stage 1, with the CI smoke-boot job required to exercise the cron route specifically
  (a bare process-boot check wouldn't have caught this class of bug).
- **Round 3** — Codex's round-1/2 recommendation to canonicalize on `task-management`'s
  `TaskExecutor` (reasoning: `apps/fitbit-break`'s package.json declares it as a
  dependency) was challenged by Claude: `time-engine` is the plan's own already-settled
  public-API entry point (Stage 4), is live (exercised by `apps/take-a-break`), and
  `task-management`'s copy has zero confirmed callers anywhere. Codex re-verified directly
  and reversed its recommendation — `time-engine`'s `TaskExecutor` is canonical.
- **Round 4** — a holistic pass found the growing Stage 1 item list (14+ items) was mixing
  must-fix bugs with pure cleanup, and, following up on Round 3's finding, confirmed that
  **all** of `packages/task-management` (not just its `TaskExecutor.js`) has zero callers
  anywhere in the repo — recommended deleting the whole package rather than backfilling
  tests for it in Stage 6. Proposed splitting into a new Stage 1.5 for the cleanup items.
- **Round 5 (final)** — Claude pushed back on introducing a whole new stage number for
  what's mechanical cleanup, since earlier Phase 1 rounds already collapsed an
  over-inflated 11-stage plan to 7 for the same solo-maintainer reason; proposed 1a/1b
  within a single Stage 1 instead (mirroring the existing 3a/3b pattern). Codex agreed,
  re-verified the cron.js and task-management findings a third time (both held), caught
  one remaining gap (the plan text needed to explicitly say to remove
  `apps/fitbit-break/package.json`'s now-dangling `@time-fit/task-management` dependency
  line, not just delete the package directory), and confirmed no showstoppers. Claude then
  discovered, while doing the final integration pass, that `cron.js` is broken more badly
  than stated — it imports **four** nonexistent local files, not one — and updated Stage 1a
  accordingly.
