# Codex critique — Run 2 (v2)

## 1. Integration check against Run 1

| Run 1 recommendation | v2 integration | Assessment |
|---|---|---|
| Make Stage A a correctness gate | Stage A includes the undeclared `datetime`, un-awaited actions, registrations, preference resolver, broken Fitbit import, missing root entry point, dependency metadata, and deterministic smoke ([`docs/jitai-library-plan.md:117-125`](../jitai-library-plan.md#L117)). | **Mostly correct.** It adopts the two executor defects and useful regression tests. The response calls this “all 6 engine defects” ([`run-1-claude-response.md:20`](run-1-claude-response.md#L20)), although v2 itself lists seven numbered items and leaves the incompatible action/condition shape (#14) without a migration test. |
| Make a decision-record/idempotency protocol the first contract | Stage B now makes decision ID, availability/reason data, allocation, arm, action outcome, claim-before-act, and calendar ADRs precede core code ([`docs/jitai-library-plan.md:127-136`](../jitai-library-plan.md#L127)). | **Partially correct.** The ordering is right, but the `claim(id) → boolean; record(decision)` port in the target architecture ([`docs/jitai-library-plan.md:104-106`](../jitai-library-plan.md#L104)) has no lease, claim record, completion transition, failure state, or atomicity criterion. The proposed ID is underspecified; section 3 explains why. |
| Specify calendar semantics before performance | Stage B gives IANA-only, gap/fold, participant-zone cron, and configurable catch-up defaults plus fixtures ([`docs/jitai-library-plan.md:132-136`](../jitai-library-plan.md#L132)). | **Partially correct.** This is a material improvement, but fixtures are only “to be executed” later and no acceptance says how schedule occurrences are enumerated, what `N` measures, or whether delayed decisions are delivered versus merely logged. |
| Use a thin core before wholesale package splitting | v2 creates `packages/core` with a memory adapter and defers broader package boundaries ([`docs/jitai-library-plan.md:138-160`](../jitai-library-plan.md#L138)). | **Partially correct.** The sequence is much better, but “executor logic ported (not imported)” creates two semantic implementations before the compatibility façade is proved. There must be a shared contract suite and a cutover/removal criterion. |
| Reduce package count and add packed-consumer acceptance | The plan has three publishable units and gates core on `npm pack` clean-fixture execution ([`docs/jitai-library-plan.md:102-103`](../jitai-library-plan.md#L102), [`142-144`](../jitai-library-plan.md#L142)). | **Correct.** This responds directly to the currently missing `time-engine` root file (`packages/time-engine/package.json:4`) and the missing `exports` maps. |
| Make benchmarks report-only and strengthen release readiness | Stage G makes the benchmark report-only; Stage H adds governance, Node matrix, privacy guidance, provenance dry run, Dependabot, and license scan ([`docs/jitai-library-plan.md:170-183`](../jitai-library-plan.md#L170)). | **Correct.** Add an import test for every supported export subpath, not only the quickstart. |

The material distortion is Stage A's proposed “import” fix for the legacy resolver. `TimeEngine`
calls `GeneralUtility.getLocalTime` ([`packages/time-engine/TimeEngine.js:42`](../../packages/time-engine/TimeEngine.js#L42)), but `GeneralUtility` has no such method—the file only imports Luxon and defines unrelated application utilities ([`packages/app-utils/GeneralUtility.js:1-15`](../../packages/app-utils/GeneralUtility.js#L1), [`120-124`](../../packages/app-utils/GeneralUtility.js#L120)). Importing it would turn the current `ReferenceError` into a `TypeError`; it would also add an undeclared `time-engine → app-utils` dependency even though `app-utils` is explicitly application code ([`packages/app-utils/package.json:11-16`](../../packages/app-utils/package.json#L11), [`docs/jitai-library-plan.md:89-90`](../jitai-library-plan.md#L89)). Stage A must instead implement the façade's zone conversion locally with Luxon (while preserving its legacy field mapping) or inject that function from the Fitbit composition root.

## 2. Rebuttal of the pushbacks

### Transactional outbox and provider idempotency

I **concede** that a transactional outbox and universal provider idempotency cannot sensibly be
a v1 *core* requirement. The core does not own Twilio/Mailjet delivery, and forcing every
adapter author to operate a queue would conflict with the stated single-process v1 scope
([`run-1-claude-response.md:28-37`](run-1-claude-response.md#L28),
[`docs/jitai-library-plan.md:79-81`](../jitai-library-plan.md#L79)). Passing `decisionId` to
integrations is a good extension point.

I **counter** that the plan must state the remaining failure semantics, not imply stronger
reliability. With durable `claim` before action, a crash after the claim and before delivery
means a permanently missed intervention; claiming after delivery allows duplicates. The current
engine already writes before/after work in separate awaits—event first, then task execution
([`packages/time-engine/TimeEngine.js:205-214`](../../packages/time-engine/TimeEngine.js#L205))—and
the legacy task log has neither a decision key nor a delivery-state field
([`prisma/schema.prisma:236-271`](../../prisma/schema.prisma#L236)). V1 can choose
at-most-once and accept possible loss, but then `claim` must durably record `claimed`,
`completed`, and `failed` (with timestamps/error signature), document no automatic retry, and
test a simulated crash at each boundary. The existing Twilio helper does not receive or use an
idempotency key ([`packages/helper/TwilioHelper.js:6-24`](../../packages/helper/TwilioHelper.js#L6)),
so “integrations may use it” is not acceptance for the supplied integration.

### Legacy preference resolver and `preActivationLogging`

I **concede** the compatibility principle: the new core should require a resolver at task
registration, whereas the deprecated façade may retain its Fitbit-oriented field mapping and
warn, as Claude proposes ([`run-1-claude-response.md:38-45`](run-1-claude-response.md#L38)).
Likewise, changing existing Prisma task logging from `preActivationLogging: false` would silently
change dashboards and storage volume; the current schema defaults it false
([`prisma/schema.prisma:212-226`](../../prisma/schema.prisma#L212)).

The necessary correction is that there is no working resolver behavior to preserve: it currently
throws on preference checkpoints and the requested imported method does not exist (section 1).
The Stage A acceptance must characterize legacy field selection—weekday/weekend, custom
reference name, invalid/missing preference—and preserve *that intended mapping*, not merely
import an application utility. For the new core, “log every decision” must mean that a decision
record is produced even when unavailable; keeping the legacy flag is compatible only if the
facade clearly advertises legacy/non-MRT logging rather than claiming its logs meet the new goal.

## 3. Deep dive: v2 design gaps and risks

### Ports and plugin contract

The ports are close to minimal but not yet implementable. `participants` needs a stable
`participantId` and an IANA zone contract; all other participant attributes should remain
opaque to core-owned code. Today the executor assumes `username`, `timezone`, and a particular
`groupMembership` object ([`packages/time-engine/TaskExecutor.js:43-49`](../../packages/time-engine/TaskExecutor.js#L43),
[`238-254`](../../packages/time-engine/TaskExecutor.js#L238),
[`353-397`](../../packages/time-engine/TaskExecutor.js#L353)). `tasks` has no operation or
snapshot/version semantics in the port list, despite core needing a stable task configuration
to validate, schedule, log, and derive the ID. Define `iterateParticipants({ cursor, limit })`,
`listActiveTasks(at)`, immutable task `id/version`, and an explicit participant-independent
scope ID rather than letting a “system user” leak from the old model.

Combining Action and Condition as `{ type, execute(spec, ctx) } → Promise` hides materially
different result types. Current conditions return `{ result, recordInfo }`
([`packages/time-engine/TaskExecutor.js:334-350`](../../packages/time-engine/TaskExecutor.js#L334));
actions return delivery-specific values ([`packages/action-collection/NoAction.js:4-15`](../../packages/action-collection/NoAction.js#L4)). The new contract needs discriminated
`ConditionResult` and `ActionResult`, a typed/reported plugin error policy, and registration-time
plugin-specific schema/validator ownership. A generic JSON Schema cannot validate a condition's
or action's private `spec` without a schema supplied by that plugin. Also specify whether
plugins are immutable singleton objects: current code mixes static class methods and stateful
instances ([`packages/action-collection/HelloAction.js:4-13`](../../packages/action-collection/HelloAction.js#L4),
[`packages/action-collection/DesktopNotificationAction.js:3-24`](../../packages/action-collection/DesktopNotificationAction.js#L3)),
which the proposed object contract correctly rejects but Stage A/D never migrates.

### Decision identity, calendar, and catch-up

`hash(taskId, taskVersion, participantId, scheduledInstantUTC)` is a sound *starting key* for
one decision per task/participant/scheduled occurrence, including recurring occurrences at
different instants. It is insufficient until the plan defines all inputs: canonical string
encoding/hash algorithm, a persistent `taskVersion`, the system-task participant/scope ID,
and an `occurrence`/checkpoint identity when one task has multiple coincident decision points.
The existing task model has only an ObjectId and mutable JSON configuration—no version field
([`prisma/schema.prisma:212-233`](../../prisma/schema.prisma#L212))—so editing a task cannot
reliably create `taskVersion` without an explicit versioning workflow. Multiple randomized
outcomes normally belong in one decision record and do not need IDs of their own; repeated
actions must instead be represented as ordered attempts within that one decision.

The DST defaults are defensible but incomplete: “gap → next valid instant” needs an example
(for example 02:30 becoming 03:00 or 03:30), and “fold → first occurrence” must be applied
consistently to fixed-time and cron checkpoints. More importantly, catch-up must enumerate
*scheduled occurrences* from a durable scheduler watermark, not evaluate every participant at
`tick(now)` for the last five wall-clock minutes. Otherwise a 30-minute cron task, a task
created during the window, or a restart with no durable last-tick state has ambiguous behavior.
The current code simply compares two observed minutes and runs at `now`
([`packages/time-engine/TimeEngine.js:160-175`](../../packages/time-engine/TimeEngine.js#L160));
v2 must define a new durable cursor/watermark port or explicitly make catch-up in-memory-only.

### Migration and compatibility

“Executor ported (not imported)” is a deliberate clean break, but without an executable
parity suite it invites bug fixes to diverge while both engines exist. Stage C should make the
Stage B fixtures and the Stage A scenario tests run against both legacy and core where
semantics are intended to match, list intended changes (MRT logging/calendar defaults), and set
a deadline/criterion for deleting the old executor. Otherwise Stage D's façade wrapper
([`docs/jitai-library-plan.md:146-152`](../jitai-library-plan.md#L146)) will conceal two
engines rather than safely migrate one.

Stage D calls a unique decision-key index a “Prisma migration,” but the existing study schema
uses the MongoDB provider and `taskLog` lacks all fields needed to reconstruct a decision ID,
particularly scheduled instant, zone, and task version ([`prisma/schema.prisma:236-271`](../../prisma/schema.prisma#L236)). A live-study migration needs its own acceptance: additive nullable
fields; duplicate/collision audit; a documented fallback identity for legacy rows; a backfill
or explicit non-backfill decision; partial/unique index rollout verified on a clone; dual-read
and rollback plan. Treating it as an ordinary adapter step risks a failed deployment or an
index that cannot be built over existing data.

Stage E's “compatibility subpaths for old deep imports that apps use” is not precise enough
([`docs/jitai-library-plan.md:154-160`](../jitai-library-plan.md#L154)). The apps import deep
paths from `time-engine`, `action-collection`, `helper`, `database`, and `app-utils`—for
example [`apps/take-a-break/index.js:1-2`](../../apps/take-a-break/index.js#L1) and
[`apps/fitbit-break/pages/api/cron.js:1-5`](../../apps/fitbit-break/pages/api/cron.js#L1)—while
the same stage makes `helper`/`database` private or deletes them. State whether compatibility
is only an internal-workspace bridge or a published semver promise, enumerate every supported
subpath, and test imports and behavior from packed tarballs. Do not promise a one-minor
deprecation for packages that will not be published.

## 4. Modularity, reuse, and performance

V2 can become reusable for a different participant model only if core treats participants as
opaque records plus a stable ID and time zone; conditions and actions must obtain every
study-specific attribute through their own injected services. The proposed `preferenceResolver`
is the right escape hatch for different wake/bed models, but its signature and return/error
contract are absent. It should receive `(participant, checkpoint, scheduledAt)` and return a
validated local time/temporal rule, not a Fitbit field name; core must never retain or serialize
the participant object without an explicit safe snapshot function.

The remaining study-specific surface is safely contained only if the legacy façade and Prisma
adapter are explicitly non-core. Current `TimeEngine.start()` hardcodes the Fitbit-style
weekday/weekend preference fields ([`packages/time-engine/TimeEngine.js:45-64`](../../packages/time-engine/TimeEngine.js#L45));
current task generation additionally defaults a `system-user` style participant-independent
task and old field-oriented task shape ([`packages/helper/TaskGeneratorHelper.js:4-49`](../../packages/helper/TaskGeneratorHelper.js#L4)). V2 should label these as legacy adapters/examples, never core defaults.

On performance, the paginated iterator and bounded concurrency are appropriate, but a simple
concurrency limit can overload an adapter if each condition performs multiple remote queries.
Require backpressure (only request the next page while capacity exists), ordering guarantees for
per-participant decisions, configurable limits validated at construction, and batch boundaries
that preserve per-decision claim/record integrity. The existing nested sequential work
([`packages/time-engine/TimeEngine.js:180-200`](../../packages/time-engine/TimeEngine.js#L180),
[`packages/time-engine/TaskExecutor.js:39-176`](../../packages/time-engine/TaskExecutor.js#L39))
is slow, but changing it without per-participant ordering and idempotency can change intervention
semantics.

## 5. Top five recommended changes and score

1. **Repair and test the actual legacy resolver implementation, not an import.** Use Luxon or
   an injected facade resolver, preserve the intended legacy mapping, and add preference
   checkpoint tests; `GeneralUtility.getLocalTime` does not exist
   (`packages/time-engine/TimeEngine.js:42`; `packages/app-utils/GeneralUtility.js:1-355`).

2. **Turn the decision-log port into a state-machine contract.** Specify durable
   claim/complete/fail states, ownership/lease or explicit no-retry policy, atomicity,
   idempotent `record`, crash tests, and the user-visible at-most-once-loss tradeoff. An
   outbox can remain deferred, but the failure semantics cannot.

3. **Complete the identity and schedule contract before Stage C.** Define canonical decision
   key encoding, task version lifecycle, system scope, coincident-checkpoint occurrence,
   durable cursor, and exact catch-up enumeration; add fixtures that assert every one.

4. **Make plugin contracts discriminated and schema-owning.** Separate `ConditionResult` from
   `ActionResult`, define error behavior and stateful-vs-singleton plugins, and require a
   validator/schema per registered plugin. Add a legacy class/instance adapter and tests before
   the façade delegates to core.

5. **Split Stage D/E acceptance into a data-migration and a compatibility plan.** Rehearse the
   MongoDB unique-index rollout/backfill on a production-shaped copy, and publish a finite,
   tested packed-tarball subpath table. This prevents the highest-risk study-data change and the
   public API promise from hiding inside broad refactor stages.

**Score: 7/10.** V2 has a sounder sequence and much stronger OSS discipline, but it is not yet
implementation-ready because its legacy resolver fix is invalid and the central
decision/scheduling/plugin contracts still leave observable behavior undefined.
