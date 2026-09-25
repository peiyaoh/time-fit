# ADR 0002: Ports

## Context
Legacy hardwires Prisma-backed functions in `TimeEngine.start()` (`TimeEngine.js:32-68`),
overwriting whatever the developer registered. Core must depend only on interfaces the app
injects.

## Decision
Ports are plain objects. A `storage` object may provide `participants`, `tasks`, and
`decisionLog` together; any port can be overridden individually in the engine config.

| Port | Methods | Required |
|---|---|---|
| `participants` | `iterate({ cursor: string \| null, limit: number }) → Promise<{ items: Participant[], nextCursor: string \| null }>` | if any task has `scope: "participant"` |
| `tasks` | `listActive(at: Date) → Promise<TaskSpec[]>` | unless static `tasks` config given |
| `decisionLog` | `claim(record, { token }) → Promise<{ claimed: boolean }>`; `complete(decisionId, result) → Promise<{ applied: boolean }>`; `fail(decisionId, error) → Promise<{ applied: boolean }>`; optional `recordGap({ from, to, tickId }) → Promise<void>` | yes |
| `clock` | `now() → Date` | no (default system clock) |
| `random` | `(seed: string) → number` in `[0, 1)` | no (default `seedrandom`) |
| `logger` | `debug/info/warn/error(event: string, fields: object)` | no (default no-op) |
| `preferenceResolver` | `(participant, { taskId, checkpointId, preference }, localDate: "YYYY-MM-DD") → Promise<Result<"HH:mm">>` | iff a task has a `preference` checkpoint |

### Contract details
- **`participants.iterate`:** `limit` = `options.pageSize` (1–1000, default 100). The engine
  requests the next page only when concurrency capacity frees up. It stops at
  `nextCursor === null` or after `options.maxParticipants` (default 100,000; exceeding it
  logs `participants-cap-reached`).
- **`tasks.listActive`:** result capped at `options.maxTasks` (default 500). Each spec is
  validated (ADR 0006). Invalid specs are dropped for this tick with `task-invalid {taskId, code}`,
  and the rest proceed.
- **`decisionLog.claim`:** atomic insert keyed by `record.decisionId`.
  Returns `claimed: true` if inserted, **or if a record with this `decisionId` already exists
  with the same `token`** (the engine passes `tickId`). This makes an adapter's internal retry
  of a lost-response claim safe. It returns `claimed: false` if the record exists with a
  different token. An `unavailable` record is claimed directly in its terminal state.
- **`complete` / `fail`:** transition `claimed →` terminal only. On an already-terminal record
  they return `applied: false` and change nothing (idempotent).
- **Static `tasks`:** `tasks: TaskSpec[]` in config (≤ `maxTasks`), validated at
  construction. Construction fails with a typed error listing every invalid spec.

### Failure behavior (core never retries; adapters may retry internally)
| Failure | Engine behavior |
|---|---|
| `tasks.listActive` throws/rejects | Tick aborted: `tick-failed {stage: "tasks"}`; next tick's window re-covers occurrences (ADR 0005) |
| `participants.iterate` throws | Stop iterating this task-set for this tick: `participants-failed`; already-processed decisions stand |
| `claim` throws | Decision skipped (**not executed**): `decision-claim-failed` |
| `complete`/`fail` throws | Logged `decision-finalize-failed`; record stays `claimed` (visible, never re-sent) |
| `recordGap` throws | Logged; tick continues |
| `preferenceResolver` returns `ok:false` or throws | No decision point for that participant/date; counted as `preferenceUnresolved` in tick summary (debug-level per participant) |

Every log event carries `tickId`. Events inside a decision also carry `decisionId`,
`taskId`, and `participantId`. Errors carry `code`, `message`, and `stack` when available.

## Consequences
- An adapter implements three required methods (claim/complete/fail) plus two iterators.
  The conformance suite (Stage C2) verifies every rule above.
- `start()` never replaces injected ports. There is no global default storage.
