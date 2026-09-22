# ADR 0009: Clarifications from implementing the engine (Stage C2)

**Status:** Accepted (2026-09-22). **Adds to (does not reverse):** ADRs 0002, 0003, 0004, 0005.

## Ports (ADR 0002)
- `decisionLog.complete(decisionId, { finishedAt, delivery })` and
  `decisionLog.fail(decisionId, { finishedAt, error })`. The engine supplies `finishedAt`
  (the tick time), so adapters need no clock.
- Adapters store the claim `token` with the record (the memory store calls it
  `claimToken`) so a same-token re-claim can return `claimed: true`.
- A `participants` page with more items than `limit`, a non-array `items`, or a cursor that
  is neither a string nor `null` aborts the tick at stage `participants`.
- If `tasks.listActive` returns more than `maxTasks` specs, the extras are dropped with a
  single `tasks-cap-reached` warning, not one rejection per spec.
- A dynamically loaded participant-scope task with no `participants` port is rejected with
  `missing-participants-port`. Static tasks fail at construction instead.

## Tick semantics (ADR 0005)
- `lastTick` advances **only when a tick completes**. A tick aborted by a port failure
  leaves it unchanged, so the next tick re-covers the same window and `claim` dedupes the
  decisions that already ran.
- A tick whose `now` is not after `lastTick` does nothing, logs
  `tick-clock-not-advanced`, and returns `completed: false, window: null`.
- A tick promise rejects only on an engine bug (never for port or plugin failures).
  Under `start()`, such a rejection is logged as `tick-crashed` and the next minute runs
  normally.
- The summary's `counts` contains one counter per outcome:
  `occurrence, ineligible, unavailable, unavailableRecorded, claimed, skippedClaimed,
  completed, failed, claimFailed, finalizeFailed, preferenceUnresolved, participantInvalid,
  participantInvalidTimezone, taskRejected`. `completed`/`failed` count **action outcomes**;
  if writing the outcome also fails, `finalizeFailed` is counted too.

## Participants and plugins (ADRs 0001, 0003)
- Participants are deep-copied (`structuredClone`) and frozen at intake. A participant that
  cannot be cloned (e.g. contains functions) is counted as `participantInvalid`.
- Plugin `ctx` also carries `timeZone`, the zone the decision was scheduled in. The
  built-in `time-window` condition needs it.
- An action result that is not a well-formed `ActionResult` fails the decision with
  `invalid-action-result`. A throwing `snapshot()` is recorded as
  `snapshot: { snapshotFailed: { code: "snapshot-threw", ... } }` rather than aborting.
- Payloads that cannot be serialized (circular, BigInt) are stored as
  `{ unserializable: true }`. Payloads over 8 KB are stored as `{ truncated: true, sizeBytes }`.

## Built-in `time-window`
Endpoints are resolved as reference, then `startOf`, then `offset`, matching legacy
`generateStartOrEndDateTimeByReference`. A participant reference that is missing, or is not
a `Date` or offset ISO string, yields `{ ok: false, error: { code: "time-window-reference-missing" } }`,
which makes the decision unavailable with reason `condition-error`.

## Packages
- `@time-fit/core/memory`: `createMemoryStore({ participants, tasks, retentionMinutes = 65,
  maxRecords = 10_000 })`. Tasks expose `upsert`/`remove`/`list`; the decision log exposes
  `get`/`records`/`gaps` for inspection. **Not for research data.** `retentionMinutes` must
  be at least the engine's catch-up window.
- `@time-fit/core/testing`: `decisionLogConformanceChecks`, an array of
  `{ name, run(createDecisionLog) }` using `node:assert` (any test runner).
