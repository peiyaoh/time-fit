# Codex critique — Run 1 (DRAFT v1)

## 1. Fact check: section 1 findings

1. **CONFIRMED — the current engine is Prisma-coupled.** `TimeEngine` directly imports
   five helpers, including the persistence-oriented task, user, event, and task-log helpers
   ([`packages/time-engine/TimeEngine.js:3`](../../packages/time-engine/TimeEngine.js#L3)-[`7`](../../packages/time-engine/TimeEngine.js#L7)). Those helpers import the database
   client (for example, [`packages/helper/EventHelper.js:1`](../../packages/helper/EventHelper.js#L1)
   and [`packages/helper/UserInfoHelper.js:2`](../../packages/helper/UserInfoHelper.js#L2)); the
   package manifests declare `time-engine → helper → database → @prisma/client`
   ([`packages/time-engine/package.json:10`](../../packages/time-engine/package.json#L10)-[`14`](../../packages/time-engine/package.json#L14),
   [`packages/helper/package.json:10`](../../packages/helper/package.json#L10)-[`16`](../../packages/helper/package.json#L16),
   [`packages/database/package.json:10`](../../packages/database/package.json#L10)-[`15`](../../packages/database/package.json#L15)).
   `database/prisma.js` constructs the default client during module evaluation
   ([`packages/database/prisma.js:64`](../../packages/database/prisma.js#L64)-[`65`](../../packages/database/prisma.js#L65)); the named getter is lazy only for call sites that avoid this module's default export.

2. **CONFIRMED — `helper ↔ database` is a manifest dependency cycle and `helper` mixes concerns.**
   Each package declares the other as a runtime dependency
   ([`packages/helper/package.json:10`](../../packages/helper/package.json#L10)-[`12`](../../packages/helper/package.json#L12),
   [`packages/database/package.json:10`](../../packages/database/package.json#L10)-[`13`](../../packages/database/package.json#L13)).
   The helper directory contains pure utilities alongside Prisma repositories and vendor helpers
   ([`packages/helper/DateTimeHelper.js:1`](../../packages/helper/DateTimeHelper.js#L1)-[`3`](../../packages/helper/DateTimeHelper.js#L3),
   [`packages/helper/TaskHelper.js:1`](../../packages/helper/TaskHelper.js#L1),
   [`packages/helper/TwilioHelper.js:1`](../../packages/helper/TwilioHelper.js#L1),
   [`packages/helper/DesktopNotificationHelper.js:1`](../../packages/helper/DesktopNotificationHelper.js#L1)).

3. **CONFIRMED — `start()` silently replaces registrations.** It unconditionally installs
   user, checkpoint-preference, event, and task-log defaults
   ([`packages/time-engine/TimeEngine.js:32`](../../packages/time-engine/TimeEngine.js#L32)-[`68`](../../packages/time-engine/TimeEngine.js#L68)); the public registration methods merely assign static fields
   ([`packages/time-engine/TimeEngine.js:88`](../../packages/time-engine/TimeEngine.js#L88)-[`90`](../../packages/time-engine/TimeEngine.js#L90),
   [`135`](../../packages/time-engine/TimeEngine.js#L135)-[`148`](../../packages/time-engine/TimeEngine.js#L148)).

4. **PARTIAL — the missing identifier is real, but the stated trigger is too broad.**
   `GeneralUtility` is not imported in `TimeEngine.js`, yet its default resolver references it
   ([`packages/time-engine/TimeEngine.js:1`](../../packages/time-engine/TimeEngine.js#L1)-[`7`](../../packages/time-engine/TimeEngine.js#L7),
   [`42`](../../packages/time-engine/TimeEngine.js#L42)). The resolver is called only for a
   `spec` checkpoint whose `timeStringType` is `preference`
   ([`packages/time-engine/TaskExecutor.js:427`](../../packages/time-engine/TaskExecutor.js#L427)-[`460`](../../packages/time-engine/TaskExecutor.js#L460)), not for every reference/fixed/cron checkpoint. Its hard-coded wake/bed schema and its own app-specific TODO are nevertheless exactly as reported
   ([`packages/time-engine/TimeEngine.js:47`](../../packages/time-engine/TimeEngine.js#L47)-[`64`](../../packages/time-engine/TimeEngine.js#L64)).

5. **CONFIRMED — `take-a-break` reaches Prisma on the first *observed minute change*.**
   The app calls `TimeEngine.start()` ([`apps/take-a-break/index.js:20`](../../apps/take-a-break/index.js#L20));
   `start()` registers `EventHelper.insertEvent` ([`packages/time-engine/TimeEngine.js:67`](../../packages/time-engine/TimeEngine.js#L67)). The one-second callback invokes `processClock` when its previous and current minute differ
   ([`packages/time-engine/TimeEngine.js:152`](../../packages/time-engine/TimeEngine.js#L152)-[`175`](../../packages/time-engine/TimeEngine.js#L175)); `processClock` invokes that event sink
   ([`packages/time-engine/TimeEngine.js:205`](../../packages/time-engine/TimeEngine.js#L205)-[`212`](../../packages/time-engine/TimeEngine.js#L212)), and the helper calls `prisma.event.create`
   ([`packages/helper/EventHelper.js:7`](../../packages/helper/EventHelper.js#L7)-[`12`](../../packages/helper/EventHelper.js#L12)). More strongly, importing the engine already evaluates `database/prisma.js` and constructs a client via its default export (finding 1), although it need not connect until queried. The five-second CI smoke is therefore probabilistic as claimed ([`.github/workflows/ci.yml:70`](../../.github/workflows/ci.yml#L70)-[`84`](../../.github/workflows/ci.yml#L84)).

6. **CONFIRMED — state is global/static.** The engine's scheduler, registry hooks, and task list
   are static ([`packages/time-engine/TimeEngine.js:10`](../../packages/time-engine/TimeEngine.js#L10)-[`18`](../../packages/time-engine/TimeEngine.js#L18)); action and condition registries are also static
   ([`packages/time-engine/TaskExecutor.js:10`](../../packages/time-engine/TaskExecutor.js#L10)-[`27`](../../packages/time-engine/TaskExecutor.js#L27)). The executor assigns `this.taskSpec` from a static method
   ([`packages/time-engine/TaskExecutor.js:29`](../../packages/time-engine/TaskExecutor.js#L29)-[`36`](../../packages/time-engine/TaskExecutor.js#L36)), so separate instances cannot isolate execution configuration.

7. **PARTIAL — the correctness findings hold, but two performance statements need precision.**
   An async callback is scheduled every second with no in-flight guard
   ([`packages/time-engine/TimeEngine.js:70`](../../packages/time-engine/TimeEngine.js#L70)-[`72`](../../packages/time-engine/TimeEngine.js#L72)); a task execution awaiting longer than a minute can overlap another minute transition. It neither enumerates elapsed minutes nor defines recovery after a pause ([`packages/time-engine/TimeEngine.js:160`](../../packages/time-engine/TimeEngine.js#L160)-[`175`](../../packages/time-engine/TimeEngine.js#L175)); tasks, users, and conditions are sequential loops
   ([`packages/time-engine/TimeEngine.js:180`](../../packages/time-engine/TimeEngine.js#L180)-[`200`](../../packages/time-engine/TimeEngine.js#L200),
   [`packages/time-engine/TaskExecutor.js:39`](../../packages/time-engine/TaskExecutor.js#L39)-[`176`](../../packages/time-engine/TaskExecutor.js#L176),
   [`304`](../../packages/time-engine/TaskExecutor.js#L304)-[`321`](../../packages/time-engine/TaskExecutor.js#L321)), and hot-path JSON logging exists ([`packages/time-engine/TaskExecutor.js:143`](../../packages/time-engine/TaskExecutor.js#L143)-[`175`](../../packages/time-engine/TaskExecutor.js#L175)). However, `users.findMany()` is unpaginated ([`packages/helper/UserInfoHelper.js:6`](../../packages/helper/UserInfoHelper.js#L6)-[`20`](../../packages/helper/UserInfoHelper.js#L20)) *per enabled participant-dependent task execution*, not necessarily every minute; no task due means no user load.

8. **CONFIRMED — the cited Fitbit engine import is fictional.**
   [`apps/fitbit-break/engine.mjs:3`](../../apps/fitbit-break/engine.mjs#L3) imports
   `@time-fit/data-source/fitbit/...`, while the workspace package list contains no
   `data-source` package ([`package.json:6`](../../package.json#L6)-[`9`](../../package.json#L9)). This file also has extensionless ESM imports at lines 2–3, another direct-node compatibility concern.

9. **CONFIRMED, with an additional broken-entry-point issue.** No inspected package manifest
   declares `exports` (for example [`packages/time-engine/package.json:1`](../../packages/time-engine/package.json#L1)-[`18`](../../packages/time-engine/package.json#L18)); consumers consequently use deep paths such as
   [`apps/take-a-break/index.js:1`](../../apps/take-a-break/index.js#L1)-[`2`](../../apps/take-a-break/index.js#L2).
   Separately, `time-engine` names `index.js` as `main` but no such file exists, so the proposed public-API stage must repair a currently invalid package root rather than only add maps.

10. **PARTIAL — generic actions do inherit `node-notifier`, but the vendor-dependency claim is inaccurate as written.**
    `action-collection` depends on `helper` ([`packages/action-collection/package.json:10`](../../packages/action-collection/package.json#L10)-[`14`](../../packages/action-collection/package.json#L14)), whose runtime dependencies include `node-notifier` ([`packages/helper/package.json:10`](../../packages/helper/package.json#L10)-[`16`](../../packages/helper/package.json#L16)); the generic sample uses its desktop helper ([`packages/action-collection/DesktopNotificationAction.js:1`](../../packages/action-collection/DesktopNotificationAction.js#L1)). But `twilio` is incorrectly a *devDependency* ([`packages/helper/package.json:17`](../../packages/helper/package.json#L17)-[`22`](../../packages/helper/package.json#L22)), and `node-mailjet` is imported but absent from that manifest ([`packages/helper/MailjetHelper.js:1`](../../packages/helper/MailjetHelper.js#L1)). This is worse for publishability, but it is not a correct statement that all three are transitively installed runtime dependencies.

11. **CONFIRMED.** `DatabaseUtility` mixes Fitbit persistence and Twilio/survey message
    composition ([`packages/database/DatabaseUtility.js:30`](../../packages/database/DatabaseUtility.js#L30)-[`69`](../../packages/database/DatabaseUtility.js#L69),
    [`296`](../../packages/database/DatabaseUtility.js#L296)-[`365`](../../packages/database/DatabaseUtility.js#L365)); Mongo helper hard-codes the study database
    ([`packages/mongodb-helper/MongoDBHelper.js:24`](../../packages/mongodb-helper/MongoDBHelper.js#L24)-[`29`](../../packages/mongodb-helper/MongoDBHelper.js#L29)); and the web package is UI components
    ([`packages/web-components/index.js:1`](../../packages/web-components/index.js#L1)-[`3`](../../packages/web-components/index.js#L3)). These are app/contrib concerns, not reusable JITAI core.

## 2. Missed defects and risks

- **Two live executor defects precede architectural work.** `checkOneConditionForUser` accepts
  `dateTime` but passes an undeclared `datetime`, producing a `ReferenceError` as soon as a
  condition executes ([`packages/time-engine/TaskExecutor.js:334`](../../packages/time-engine/TaskExecutor.js#L334)-[`341`](../../packages/time-engine/TaskExecutor.js#L341)). `executeActionForUser` stores but does not `await` the action promise
  ([`packages/time-engine/TaskExecutor.js:194`](../../packages/time-engine/TaskExecutor.js#L194)-[`203`](../../packages/time-engine/TaskExecutor.js#L203)); the subsequent task log may therefore persist a Promise/non-result and action failures can escape after a nominally successful decision ([`151`](../../packages/time-engine/TaskExecutor.js#L151)-[`169`](../../packages/time-engine/TaskExecutor.js#L169)). Both need regression tests in Stage A.

- **MRT decision records are incomplete and non-auditable.** Non-activated decision points are
  discarded unless optional `preActivationLogging` is true ([`packages/time-engine/TaskExecutor.js:65`](../../packages/time-engine/TaskExecutor.js#L65)-[`69`](../../packages/time-engine/TaskExecutor.js#L69),
  [`105`](../../packages/time-engine/TaskExecutor.js#L105)-[`109`](../../packages/time-engine/TaskExecutor.js#L109)); the generated schema defaults it false
  ([`prisma/schema.prisma:212`](../../prisma/schema.prisma#L212)-[`226`](../../prisma/schema.prisma#L226)). A scientific decision log needs an immutable decision ID, scheduled and evaluated instants/time zone, availability/reason codes, task/spec version, allocation probabilities, chosen arm, and action attempt/outcome—not only the mutable current log shape ([`prisma/schema.prisma:236`](../../prisma/schema.prisma#L236)-[`271`](../../prisma/schema.prisma#L271)).

- **No restart-safe idempotency boundary exists.** The schema has no decision-key uniqueness constraint in `taskLog` ([`prisma/schema.prisma:236`](../../prisma/schema.prisma#L237)-[`271`](../../prisma/schema.prisma#L271)), while `processClock` writes an event before executing actions ([`packages/time-engine/TimeEngine.js:205`](../../packages/time-engine/TimeEngine.js#L205)-[`214`](../../packages/time-engine/TimeEngine.js#L214)). A retry/crash between delivery and log persistence can duplicate an intervention or leave its randomized decision unrecorded. The ports need an atomic `claimDecision`/outbox model and provider idempotency keys; mere non-overlap in one process does not solve restart or deployment duplication.

- **Time-zone/DST policy is missing.** The executor builds a local formatted timestamp and parses it in a participant zone
  ([`packages/time-engine/TaskExecutor.js:421`](../../packages/time-engine/TaskExecutor.js#L421)-[`480`](../../packages/time-engine/TaskExecutor.js#L480)), but specifies neither the nonexistent spring-forward time nor repeated fall-back time policy. Cron parsing has no participant-zone argument
  ([`packages/helper/DateTimeHelper.js:13`](../../packages/helper/DateTimeHelper.js#L13)-[`16`](../../packages/helper/DateTimeHelper.js#L16)). The contract needs explicit semantics and tests for DST, date-line zones, invalid zones, and catch-up across those boundaries.

- **OSS/package release safety needs more than documentation.** Runtime dependency metadata is already invalid for Mailjet/Twilio (finding 10), root importability is invalid for `time-engine` (finding 9), and the present test suite needs an actual listening Mongo instance. My read-only `yarn test --runInBand` could not run its seven database-backed suites in this sandbox because `mongodb-memory-server` failed `listen EPERM`; CI must retain a clean, hermetic integration test path rather than treating a local green count as a contract. Add `npm pack`/fresh-consumer install-import tests and license/dependency/security scanning to release acceptance.

## 3. Critique of the stage plan

The direction—pure core with ports—is right, but the plan treats several large redesigns as
single mergeable PRs. Stage B combines a package split, a database-lifecycle redesign, vendor
extraction, and a new dependency linter; Stage C then changes lifecycle, state ownership,
ports, examples, and compatibility. Neither has executable acceptance criteria, a migration
matrix, nor a specified supported Node/runtime/package-manager contract.

Stage A should include the two executor defects above and characterize *decision semantics*,
not just output snapshots. It should also add a public root entry-point smoke test because
`time-engine` currently declares a missing `main` ([`packages/time-engine/package.json:4`](../../packages/time-engine/package.json#L4)). Fixing only the missing `GeneralUtility` import risks preserving an app schema in the library; replace the default with a required resolver/explicit failure rather than embedding another default.

The ordering should be: stabilize and characterize current behavior; define the minimal core
contract and memory example; migrate the legacy engine through an adapter; then split
packages incrementally. Designing a broad `ParticipantSource`, `TaskSource`, `EventSink`,
`DecisionLogSink`, clock, logger, random source, and preference resolver before specifying
the decision-record/idempotency contract will fossilize the wrong API. Conversely, moving all
app code in Stage F after extracting three vendor packages creates avoidable churn: first mark
which packages are publishable and leave non-library code in-place but unpublished, then move
only proven reusable code.

For a solo maintainer, start with three publishable units at most: `@time-fit/core`, an
optional Prisma adapter, and an examples/contrib area. `action-twilio`, `action-mailjet`, and
`action-desktop` can initially be source modules under a single optional integrations package;
split only when independent releases or dependency lifecycles justify it. Likewise, a CI
benchmark gate of 10k × 20 in under 10 seconds is premature and brittle until a workload,
hardware class, correctness model, and profiling result establish a budget. Keep benchmark
reporting non-gating initially.

Stage D's promise to keep every old deep import for a minor with a warning is underspecified:
ESM export-subpath compatibility needs explicit wrapper files/maps and a published-version
baseline. Make a compatibility table and test it from a packed tarball. Stage H is missing
acceptance for ownership/governance, supported Node versions, SBOM/dependency update policy,
accessibility/privacy guidance, disclosure handling, and a release dry run; these matter more
for a health-adjacent library than additional boilerplate issue templates.

## 4. Top five recommended changes to the plan

1. **Expand Stage A into a correctness gate before any extraction.** Fix and test the undefined
   `datetime` and un-awaited action promise, preserve injected registrations, and test the
   deterministic minute-boundary path ([`packages/time-engine/TaskExecutor.js:334`](../../packages/time-engine/TaskExecutor.js#L334)-[`341`](../../packages/time-engine/TaskExecutor.js#L341),
   [`194`](../../packages/time-engine/TaskExecutor.js#L194)-[`203`](../../packages/time-engine/TaskExecutor.js#L203)). These defects make existing condition/action behavior unreliable, so architecture work cannot safely characterize it.

2. **Make a versioned decision-record and idempotency protocol the first core contract.** Define
   `decisionId = task version + participant + scheduled instant + occurrence`, availability and
   reason logging for every decision point, atomic claim/complete semantics, and delivery
   idempotency/outbox behavior. This is required for credible MRT analysis and safe restart;
   the current `taskLog` has no such key ([`prisma/schema.prisma:236`](../../prisma/schema.prisma#L236)-[`271`](../../prisma/schema.prisma#L271)).

3. **Specify calendar semantics before scheduler performance.** Add an explicit IANA-zone,
   DST-fold/gap, cron zone, catch-up, and late-decision policy with table-driven tests. The
   current local-time construction and zone-implicit cron parsing show why this cannot be
   deferred ([`packages/time-engine/TaskExecutor.js:421`](../../packages/time-engine/TaskExecutor.js#L421)-[`513`](../../packages/time-engine/TaskExecutor.js#L513)).

4. **Replace Stage B/C with a thin-core migration slice.** First publish/test a memory-only
   `createTimeEngine` with the minimum ports and one packed-consumer quickstart; then route
   the legacy static facade through it and add Prisma as an adapter. This proves the target API
   without a high-risk repository-wide helper/vendor split, while the legacy facade maintains
   behavior during migration ([`packages/time-engine/TimeEngine.js:9`](../../packages/time-engine/TimeEngine.js#L9)-[`18`](../../packages/time-engine/TimeEngine.js#L18)).

5. **Add release/install acceptance and reduce initial package count.** Repair `time-engine`'s
   missing root entry, declare all runtime dependencies correctly, add `exports`, and gate
   releases on `npm pack` followed by installation/import in a clean fixture. Keep vendor
   integrations consolidated until a consumer needs independent versions; this addresses real
   current metadata faults ([`packages/time-engine/package.json:4`](../../packages/time-engine/package.json#L4),
   [`packages/helper/package.json:10`](../../packages/helper/package.json#L10)-[`22`](../../packages/helper/package.json#L22)).

## 5. Readiness score and verdict

**5/10.** The core diagnosis is strong, but the plan must correct the partial claims and make
decision integrity, calendar semantics, executor correctness, and packaged-consumer acceptance
first-class before it is ready to guide an OSS JITAI library refactor.
