# Claude response — Run 2

Verified: `GeneralUtility` has no `getLocalTime` (no definition anywhere in `packages/` or
`apps/`), so my v2 "fix the import" was wrong — it would turn a `ReferenceError` into a
`TypeError` and add an app-code dependency to the engine. Also verified the Prisma
datasource is `provider = "mongodb"` (`prisma/schema.prisma:9`), which matters for the
migration discussion.

## Accepted
1. **Legacy resolver**: implement zone conversion locally with Luxon inside the façade,
   preserving the weekday/weekend + custom-reference mapping; characterize it with tests
   (weekday, weekend, custom reference, missing/invalid preference).
2. **Decision-log state machine**: `claimed → completed | failed` with timestamps and error
   signature; explicit **at-most-once, no automatic retry** policy stated in docs (a crash
   after claim = a recorded-but-undelivered decision, visible as `claimed` with no
   terminal state). Crash-at-boundary tests in an adapter conformance suite.
3. **Scheduled-occurrence enumeration**: the engine enumerates checkpoint occurrences in
   `(lastTick, now]`, not "evaluate at now".
4. **Discriminated results**: `ConditionResult = { ok: true, met, evidence } | { ok: false, error }`,
   `ActionResult = { ok: true, delivery } | { ok: false, error }`; plugin errors never
   throw through the executor. Legacy class/instance adapter with tests before the façade
   delegates to core.
5. **Opaque participants**: core requires only `{ id, timeZone }`; everything else is
   opaque and reaches plugins untouched. Group membership becomes a built-in *condition*,
   not a core-known field. No "system user": participant-independent tasks use scope
   `"system"`.
6. **Backpressure**: pull-based paginated iteration; bounded concurrency *across*
   participants, sequential in priority order *within* a participant.
7. **Every export subpath gets a packed-tarball import test.**

## Pushed back
1. **Durable scheduler watermark — not needed.** Because `claim(decisionId)` is idempotent,
   on restart the engine can safely re-enumerate occurrences in a bounded window
   `(now − catchUpWindow, now]`; already-claimed decisions are skipped. A durable cursor
   adds a port and a consistency problem (cursor vs. log) for no correctness gain. Tasks
   created inside the window: an occurrence is eligible only if `scheduledAt ≥
   task.activeFrom`. Codex's ambiguity cases are resolved by these two rules.
2. **Task version lifecycle — derive, don't manage.** `taskVersion = sha256(canonical JSON
   of the validated spec)`. No versioning workflow, no schema field required in adapters;
   editing a task automatically yields a new version. Canonical encoding: RFC 8785 JSON
   canonicalization, key = `sha256(["v1", scope|participantId, taskId, taskVersion,
   checkpointIndex, scheduledAtISOUTC])`.
3. **Leases / ownership — out of v1.** Single scheduler process per deployment is a
   documented constraint; the unique claim prevents duplicates even if two processes run
   by accident. Leases belong with the deferred multi-process work.
4. **Plugin JSON Schema — replace with an optional `validate(spec) → Result`.** Core must
   not take an `ajv` dependency; plugins own validation of their own `spec`. The task-level
   schema stays hand-written validation in core.
5. **Mongo migration — avoid it instead of rehearsing it.** Don't retrofit `taskLog`. The
   Prisma adapter writes decisions to a **new `decision` collection** with its unique index
   on `decisionId` (created on an empty collection → no collision audit, no backfill).
   Legacy `taskLog` writes continue unchanged via the façade for fitbit-break's dashboards.
   A clone rehearsal of `prisma db push` is still in acceptance, but the risk is now low.
6. **Compatibility subpaths — none, if nothing is published.** Compatibility shims only
   matter for published consumers. If `@time-fit/*` has never been published to npm
   (to confirm in Run 3), the only consumers are `apps/*`, which are migrated in the same PR
   as each move. No semver promise for legacy packages; they are deleted when empty.
