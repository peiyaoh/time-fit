# time-fit → Open-Source JITAI Library: Continuation Plan

_Status: **FINAL (v6.1)**, 2026-09-22 (v6.1 = user decision on fitbit-break + Run 6 review), after 5 critique runs (Runs 1–2 critiqued by Codex; Codex hit its usage limit during Run 3, so Claude took the critic role for Runs 3–5). Under review: Codex critique ↔ Claude pushback, 5 runs.
Progress log: [`jitai-library-plan-progress.md`](jitai-library-plan-progress.md).
Round-by-round critiques: [`jitai-library-plan-review/`](jitai-library-plan-review/).
Supersedes the forward-looking stages (2–7) of [`refactor-plan.md`](refactor-plan.md); that
file stays as the historical record of Stage 1 / partial Stage 3._

---

## 1. Assessment of the current state (branch `refactor-1`, 2026-09-22)

### Done and verified
- Stage 1 (1a/1b/1c) from `refactor-plan.md` is complete and committed: broken relative
  imports repointed, phantom deps declared, `task-management` dissolved, barrels added,
  root deps moved down, root `license: MIT`, CI (`.github/workflows/ci.yml`: jest,
  `next build` for `fitbit-break`, 5 s boot for `take-a-break`).
- Stage 3 partial: `DatabaseUtility` infinite-loop bug fixed; some characterization tests.
- `yarn test`: 19 suites / 88 tests pass locally (7 suites need a listening
  `mongodb-memory-server`; they fail in sandboxes without socket permission).

### Findings that change priorities
1. **Core is coupled to Prisma.** `time-engine → helper → database → @prisma/client`;
   `TimeEngine.js:3-7` imports Prisma-backed helpers; `database/prisma.js:64-65`
   constructs a `PrismaClient` at import time via its default export.
2. **`helper ↔ database` manifest cycle**, and `helper` mixes pure utilities, Prisma
   repositories, and vendor clients.
3. **`TimeEngine.start()` overwrites registrations** (`TimeEngine.js:32-68`): user list,
   preference resolver, event sink, task-log sink are replaced unconditionally.
4. **Broken default preference resolver** (`TimeEngine.js:42`): calls
   `GeneralUtility.getLocalTime`, which is neither imported nor defined anywhere →
   `ReferenceError` for any `spec` checkpoint with `timeStringType: "preference"`; it also
   hardcodes app fields (`weekdayWakeup`, `weekendBed`).
5. **`take-a-break` is not DB-free**: first observed minute change → `EventHelper.insertEvent`
   → `prisma.event.create`. CI's 5 s smoke is probabilistic.
6. **Global static state** in `TimeEngine`/`TaskExecutor` (`this.taskSpec` set from a static
   method); no clock injection; no isolation.
7. **Scheduler gaps**: 1 s async interval with no in-flight guard; no missed-minute
   enumeration/catch-up; sequential tasks × users × conditions; hot-path
   `console.log(JSON.stringify(...))`; unpaginated `users.findMany()` per
   participant-dependent task execution.
8. **Broken import** `apps/fitbit-break/engine.mjs:3` (`@time-fit/data-source/...`), plus
   extensionless ESM imports.
9. **No `exports` maps; `time-engine`'s `main: index.js` does not exist** — the package root
   is not importable; consumers deep-import files.
10. **Wrong dependency metadata**: `helper` lists `twilio` as a devDependency but
    `TwilioHelper` imports it at runtime; `node-mailjet` is imported but undeclared;
    `node-notifier` leaks to every `action-collection` consumer.
11. **App code in `packages/`**: `DatabaseUtility`, `app-utils`, `api-handlers`,
    `web-components`, `mongodb-helper` (hardcoded `"walk_to_joy"`), most of
    `fitbit-integration`.
12. **`checkOneConditionForUser` references undeclared `datetime`**
    (`TaskExecutor.js:341`) → every condition evaluation throws. No test covers it.
13. **Actions are not awaited** (`TaskExecutor.js:197`); `executionResult` is a Promise and
    action failures become unhandled rejections.
14. **Inconsistent plugin shape**: some actions registered as instances
    (`take-a-break`), others as classes with `static execute`.
15. **Decision log is not MRT-grade**: non-activated decision points are dropped unless
    `preActivationLogging` (default `false`, `prisma/schema.prisma:221`); no decision ID,
    no allocation probabilities stored as such, no uniqueness key → no restart safety.
16. **No calendar policy**: DST gap/fold behavior, cron time zone, and catch-up are
    unspecified (`TaskExecutor.js:421-513`, `DateTimeHelper.js:13-16`).
17. **fitbit-break's production cron path still throws**: `pages/api/cron.js` (~line 93)
    calls `TaskExecutor.executeTaskForUserListForDatetime`, which does not exist (the method
    is `...ForDate`). `next build` passes because route bodies are not executed; the
    old plan's "invoke `/api/cron` in CI" requirement was never met. `cron.js` is also a
    **second composition root** that re-implements the scheduling loop instead of using
    `TimeEngine`.
18. **Nothing is published**: `npm view @time-fit/time-engine` → E404. There is no semver
    obligation to legacy paths, but ownership of the `@time-fit` npm scope is unverified.

### Net assessment
Build hygiene is fixed; **architecture has not started, and the engine has live
correctness defects** (12, 13, 4) that make conditions and actions unreliable today. The
next step is a correctness gate on the existing engine, then a small new core proven by a
packed-consumer quickstart — not further `DatabaseUtility` extraction.

---

## 2. Goal and non-goals

**Goal.** Published packages that let a developer build a time-based JITAI by declaring
tasks (checkpoints, groups, conditions, randomized outcomes), plugging in their own
participant source, decision log, and delivery channels, and running a scheduler — with
no Prisma/Fitbit/Twilio/study-schema dependency unless opted in — and with an auditable
decision log suitable for micro-randomized-trial (MRT) analysis.

**Non-goals (v1).** Hosted service; admin UI; multi-process/distributed scheduling (leases);
transactional outbox; automatic delivery retry; TypeScript rewrite; MongoDB adapter; further `DatabaseUtility`
extraction.

---

## 3. Target architecture

> Superseded in detail by [`adr/`](adr/) (Stage B). Refinements made there: an
> invalid-time-zone participant is skipped with no record (no `scheduledAt` can exist);
> "group"/"phase" eligibility collapse into one `eligibility.attributes` matcher; `claim`
> takes a `token` so adapter retries are safe; decision subjects are prefixed `p:`/`s:`;
> plugins get a timeout + `AbortSignal`; fixed-offset zones such as `+05:00` are rejected.

```
 apps/* , examples/*          composition roots (unpublished)
 contrib/legacy/* (private)   time-engine, helper, database, action-collection,
                              condition-collection/others, app-utils, api-handlers,
                              web-components, mongodb-helper, fitbit-integration,
                              fromLegacyPlugin()
        │
 @time-fit/storage-prisma     implements core ports with Prisma (opt-in)
 @time-fit/integrations       subpath exports: /twilio, /mailjet, /desktop;
                              vendor SDKs as optional peerDependencies
        │
 @time-fit/core               engine, executor, registry, spec validation, ports,
                              in-memory adapter (`@time-fit/core/memory`),
                              adapter conformance suite (`@time-fit/core/testing`); pure
        │
 luxon, cron-parser, seedrandom
```

Three publishable packages; split `integrations` per vendor only when release cadence
demands it.

### 3.1 Participants (opaque)
Core requires `{ id: string, timeZone: IANA string }`; all other attributes are opaque
and passed to plugins untouched. Core never serializes the participant; decision records
store only what a plugin returns as `evidence` plus an optional app-supplied
`snapshot(participant)` function. Participant-independent tasks use scope `"system"` (no
fake "system user"). System tasks carry their own `timeZone` (required, with no silent UTC
default).

**Eligibility vs. availability.** *Eligibility* (scope, `activeFrom`/`activeUntil`,
the spec's `eligibility` filter such as group membership or study phase) decides who is in
the population for a task. Ineligible participants produce **no** record. *Availability*
(the precondition tree) is evaluated only for eligible participants, and **every**
availability outcome is recorded.

### 3.2 Ports
| Port | Shape | Notes |
|---|---|---|
| `participants` | `iterate({ cursor, limit }) → { items, nextCursor }` | pull-based; engine requests next page only when capacity frees |
| `tasks` | `listActive(at) → TaskSpec[]` | engine validates each and derives `taskVersion` |
| `decisionLog` | `claim(decision) → { claimed: boolean }`, `complete(id, result)`, `fail(id, error)`, optional `recordGap(from, to)` | unique on `decisionId`; idempotent; see 3.4 |
| `clock` | `now() → Date` | injectable for tests |
| `logger` | `{ debug, info, warn, error }(event, fields)` | structured; default no-op |
| `random` | `(seed) → [0,1)` | default seedrandom; `seed = HMAC(studySalt, decisionId)` (or `decisionId` without salt), so draws are reproducible |
| `preferenceResolver` | `(participant, checkpoint, scheduledDate) → Result<LocalTime>` | required iff a task uses preference checkpoints; static `tasks` checked at construction, dynamically loaded tasks rejected at load (`task-invalid: missing-preference-resolver`) without stopping other tasks |

### 3.3 Plugins
`Condition = { type, validate?(spec) → Result, evaluate(spec, ctx) → Promise<ConditionResult> }`,
`ConditionResult = { ok: true, met: boolean, evidence } | { ok: false, error }`.
`Action = { type, validate?(spec) → Result, execute(spec, ctx) → Promise<ActionResult> }`,
`ActionResult = { ok: true, delivery } | { ok: false, error }`.
Plugins are immutable objects (no static classes, no per-call instance state). `ctx` =
`{ decisionId, participant, scheduledAt, logger }`. A throwing plugin is caught and
converted to `{ ok: false, error }` with its signature logged. Legacy class/instance
plugins are wrapped by `fromLegacyPlugin()`, which lives in `contrib/legacy`, never in core.

### 3.4 Decisions, identity, calendar
- **Decision record v1:** `decisionId`, scope/participantId, taskId, **taskVersion**,
  checkpointId, scheduledAt (UTC) + participant zone, evaluatedAt, availability per phase
  with reason codes, allocation probabilities, random seed/draw, chosen arm, state
  (`unavailable` | `claimed → completed | failed`) with timestamps, action results, error
  signature. Every *eligible* decision point produces exactly one record, unless the task
sets `logUnavailable: false` (opt-out for non-research uses: unavailable decisions are
then not stored).
- **Pipeline order per (participant, task, occurrence):** eligibility (no record if false)
  → availability (precondition tree) → if unavailable: `claim` in terminal state
  `unavailable` → else randomize (`seed` per 3.2) → `claim` (arm + probabilities
  included) → execute → `complete` / `fail`. A `claimed: false` result means another
  invocation owns the decision, so the engine skips it.
- **Correlation:** every log event inside a decision carries `decisionId`; tick-level events
  carry `tickId`.
- **Identity:** `decisionId = sha256(JSON.stringify(["v1", scopeOrParticipantId, taskId,
  checkpointId, scheduledAtISOUTC]))`. The key identifies the *decision point*, not the
  configuration. Editing a task never re-opens an already-claimed decision.
  `taskVersion = sha256(sorted-key JSON of the validated spec)` is recorded, not keyed.
  Multiple outcomes and attempts live inside one record.
- **Delivery semantics:** at-most-once per `decisionId`, with no automatic retry. A crash after
  claim leaves a `claimed` record with no terminal state. It is visible and reportable, and never
  silently re-sent. Duplicate prevention relies on the unique claim, so it also holds
  across overlapping serverless/cron invocations.
- **Calendar:** IANA zones only (an invalid zone makes the participant unavailable, with reason
  `invalid-timezone`). DST gap: shift forward by the gap (02:30 → 03:30). DST fold: first
  occurrence. Cron is evaluated in the participant's zone (the task's `timeZone` for
`"system"`).
- **Enumeration & catch-up:** occurrences come from a pure function
  `occurrences(checkpoint, zone, window)` (memoizable per zone in Stage F). Each tick
  enumerates checkpoint occurrences in
  `(max(lastTick, now − catchUpWindow), now]` (default window 5 min). After a restart, the
  window bounds the enumeration and `claim` dedupes. An occurrence is eligible only if
  `scheduledAt ≥ task.activeFrom`. If `now − lastTick > catchUpWindow`, the engine emits
  `scheduler.missed-window {from, to}` and calls `decisionLog.recordGap?(from, to)`.
  No durable watermark.

### 3.5 Engine and developer-facing config
```js
const engine = createTimeEngine({
  storage,                 // object exposing participants / tasks / decisionLog (per-port overrides allowed)
  tasks,                   // optional static TaskSpec[] (wrapped as a read-only tasks port)
  conditions, actions,     // plugin arrays; built-in condition: time-window; built-in eligibility: group, phase
  preferenceResolver,      // required iff a task uses preference checkpoints
  clock, random, logger,   // optional
  options: { catchUpWindowMinutes: 5, concurrency: 1, pageSize: 100 },
});
await engine.tick(now);   // primary entry point: external cron, serverless, tests
engine.start();           // convenience: in-process minute timer calling tick()
```
Config is validated at construction (guard clauses, typed errors). Specs are validated at
load, with plugin `validate()` for plugin-owned fields. Ticks never overlap in-process.
Participants are pulled page by page. Per participant, tasks run sequentially in priority
order.

### 3.6 Task spec (ADR)
`{ id, scope: "participant" | "system", timeZone? (required iff system), priority,
activeFrom?, activeUntil?,
eligibility?: { group?: {...}, phase?: [...] },
checkpoints: [{ id, cron } | { id, time: "HH:mm" } | { id, preference: name, offset? }],
precondition?: { all: [...] } | { any: [...] } | { not: ... } | { condition: {type, ...} },
outcomes: [{ id, probability, action: {type, ...} | null }],
logUnavailable?: boolean (default true) }`. Probabilities must sum to 1 (±1e-9); ids are unique; `null`
action = explicit "no intervention" arm (MRT control). The ADR maps each legacy field
(`checkPoints`, `preCondition` with operator/opposite, `outcomes[].chance`,
`randomizationEnabled: false` → single outcome with probability 1, `group` → `eligibility.group`,
`preActivationLogging`) to the new shape, citing `TaskExecutor.js:181-236, 259-333,
353-513`. Reserved for a later additive release: `Condition.evaluateBatch` (N+1
mitigation), eligibility push-down into the `participants` port, and an exported JSON
Schema.

---

## 4. Stages (each = one mergeable PR, CI green)

### Stage A: Dropped (user decision, 2026-09-22)
The fitbit-break study is not running and has no near-term features, so fixing the legacy
engine it depends on is wasted work. The known legacy defects (#4, #12, #13, #17) are
listed in `contrib/legacy/README.md` during Stage D instead. The only surviving item is a
**one-line CI fix**: take-a-break's smoke job crashes (exit 1) whenever its 5 s window
crosses a minute boundary (verified), so it starts only when the current second is ≤ 50.
It ships with Stage B.

### Stage B: Contract and names
> **Status (2026-09-22): done except the npm scope (maintainer action).** ADRs 0001–0007
> are in [`adr/`](adr/), and fixtures are in [`packages/core/__test__/fixtures/`](../packages/core/__test__/fixtures/) (moved there in Stage C1). The CI smoke fix
> is in `.github/workflows/ci.yml`. **The ADRs are now the source of truth for §3**; where
> they differ from §3 (below), the ADR wins.
**Change:** ADRs for §3.1–3.6. Fixtures: DST gap/fold, date-line, invalid zone,
catch-up/missed-window, task created mid-window, coincident checkpoints, `decisionId`
goldens, edit-during-window (same `decisionId`), reproducible draws from the seed,
ineligible → no record / unavailable → one record, and each intended change vs. legacy.
**Claim the npm scope** (or pick names) now. This is a **user action** (npm account).
The §3.6 ADR describes *intended* legacy semantics read from code; the legacy condition
path never executed (#12).
**Acceptance:** ADRs merged; fixtures committed with expected outputs; npm scope owned.

### Stage C1: Pure kernel
> **Status (2026-09-22): done.** `packages/core` (private until Stage G) has 11 pure
> modules and 206 tests. All Stage B fixtures they cover pass (calendar, identity,
> task-spec validation), with 100% statement/branch/function/line coverage enforced in CI.
> `scripts/check-core-dependencies.mjs` checks both the manifest and source imports.
> Clarifications are in ADR 0008. `engine-scenarios.json` is for C2.
**Change:** `packages/core` pure modules with no I/O and no timers: task-spec validation
(typed errors), `occurrences(checkpoint, zone, window)`, `decisionId`/`taskVersion`,
seeded randomization, eligibility and precondition-tree evaluation (legacy semantics
ported per the §3.6 ADR, not imported).
**Acceptance:** all Stage B fixtures for these functions pass; 100% branch coverage on the
kernel; no runtime deps beyond {luxon, cron-parser, seedrandom}.

### Stage C2: Engine
> **Status (2026-09-22): done.** `createTimeEngine` (`src/engine/`), built-in
> `time-window`, `@time-fit/core/memory`, and `@time-fit/core/testing`. All 18
> `engine-scenarios.json` cases pass. The memory store passes the conformance suite. Core has
> 318 tests at 100% coverage. `examples/quickstart` runs from an `npm pack` tarball in an empty
> directory (`scripts/verify-packed-quickstart.sh`, new CI job). Clarifications are in ADR 0009.
**Change:** `createTimeEngine` (tick loop, in-flight guard, pagination, concurrency
parameter default 1, `storage`/static-`tasks` config, built-in `time-window` condition,
`group`/`phase` eligibility). The memory store keeps records only inside a retention window
(default `catchUpWindow + 1h`, optional `maxRecords`) and is documented as not for
research data. The adapter conformance suite (`@time-fit/core/testing`) uses `node:assert`
and exports async functions any test runner can call: claim idempotency, state transitions,
claimed-never-completed, `unavailable`, gaps.
**Acceptance:** remaining Stage B fixtures pass. `examples/quickstart` (memory-only, about 20
lines) runs from an `npm pack` tarball in a clean fixture. The memory store passes the
conformance suite.

### Stage D: Legacy quarantine + fresh Prisma adapter
**Change:** move the `apps/fitbit-break` app itself plus `time-engine`, `helper`, `database`, `action-collection`,
`condition-collection/others`, `app-utils`, `api-handlers`, `web-components`,
`mongodb-helper`, and `fitbit-integration` into `contrib/legacy/*` (private, unchanged
behavior, workspace paths updated, fitbit-break still green), together with `test_script/`
(77 ad-hoc scripts, not converted) and the `DatabaseUtility` characterization tests.
This is a *move*, not a rewrite. Add `contrib/legacy/README.md` (frozen, unmaintained,
known defects #4/#12/#13/#17). The fitbit-break `next build` CI job stays through this
stage, then becomes manual-trigger. `docs/refactor-plan.md` gets a "superseded by" banner. take-a-break stays on legacy until Stage E. Then add
`@time-fit/storage-prisma`: it takes an **injected `PrismaClient`** (no module
singleton) and ships **schema fragments** (SQLite, Postgres) for `participant`, `task`,
`decision` (unique `decisionId`), and `gap`, which the app merges into its own schema. Add
`examples/prisma` on SQLite.
**Acceptance:** fitbit-break build + `/api/cron` invocation still green. Storage-prisma
passes the conformance suite in CI on SQLite (no Docker). `examples/prisma` runs from packed tarballs.
Dependency-cruiser in CI: no cycles; published packages never import `contrib/`.

### Stage D′: Not planned
Dropped by the user decision (study not running). Reviving the study later means first
fixing the listed legacy defects, or migrating it onto core with a fitbit-break-owned
adapter.

### Stage E: Integrations
Can run in parallel with D after C2. `@time-fit/integrations` provides `/twilio`, `/mailjet`,
and `/desktop` as core `Action`s. SDKs are optional peers. Credentials are passed in by the app and
never read from `process.env` inside the library. `decisionId` is forwarded where the provider has a
reference/idempotency field. Tests mock the SDKs.
**Acceptance:** core + integrations installed without peers, importing only `/desktop`,
works. **take-a-break runs on core** (memory store + `/desktop`) with no DB config.

### Stage F: Concurrency and throughput
**Change:** enable and test `concurrency > 1` (per-participant order preserved,
backpressure on page fetches), per-zone memoization of `occurrences()` within a tick, batched decision writes that keep per-decision claim
integrity, log levels, benchmark script (decisions/sec for synthetic N × M,
report-only).

### Stage G: Open-source release readiness
Library-first README + quickstart; per-package READMEs; API docs + `.d.ts` from JSDoc;
CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, GOVERNANCE; `engines` + CI Node matrix; privacy
guidance; delivery-semantics doc (at-most-once, missed windows); the measured scale
envelope from the F benchmark; `CITATION.cff` updated + "citing / MRT usage" section; changesets;
`npm publish --provenance` dry run; Dependabot; license scan.
**Acceptance:** the release dry run produces tarballs that pass all clean-fixture tests.

Effort (solo): B M · C1 L · C2 L · D M · E M · F M · G M.
Order: **B → C1 → C2 → (D ∥ E) → F → G**.

---

## 5. Definition of done (v1)
Stages B–G (C1 and C2 both) merged. `@time-fit/core`, `@time-fit/storage-prisma`,
and `@time-fit/integrations` are published at `0.x` and usable from packed tarballs. The memory and
Prisma adapters pass the conformance suite. take-a-break and the new examples run on core.
fitbit-break is quarantined in `contrib/legacy` with its known defects documented.

## 6. Open decisions
- ~~Is the fitbit-break study still live?~~ **Resolved 2026-09-22:** not running, no
  near-term features, so it is quarantined, Stage A is dropped, and D′ is not planned.
- Keep monorepo in this repo (default) vs. new library repo with apps as examples.
- Core name: `@time-fit/core` (default) vs. reusing `@time-fit/time-engine`.

## 7. How this plan was produced
Five critique runs (full record in [`jitai-library-plan-review/`](jitai-library-plan-review/)
and [`jitai-library-plan-progress.md`](jitai-library-plan-progress.md)):
v1 → Codex 5/10 → v2 → Codex 7/10 → v3 → critic 7/10 → v4 → critic 8/10 → v5 → critic 9/10 → **v6 final**.
Runs 3–5 were critiqued by Claude after Codex hit its usage limit. Those runs lack an
independent reviewer; the user then asked Claude (not Codex) to do a post-final review: see
[`run-6-claude-review.md`](jitai-library-plan-review/run-6-claude-review.md).
