# ADR 0006: Task spec

## Context
The task spec is the contract developers write most. Legacy semantics live in
`TaskExecutor.js` and `TaskGeneratorHelper.js`. **The legacy condition path never ran**:
every condition evaluation threw on an undefined variable (`TaskExecutor.js:341`). The
precondition semantics below are therefore the **intended** semantics read from code, not
observed production behavior.

## Decision

### Shape (v1)
```js
{
  id: string,                         // ^[a-z0-9][a-z0-9._-]{0,127}$, unique per engine
  enabled?: boolean,                  // default true
  scope: "participant" | "system",
  timeZone?: string,                  // REQUIRED iff scope === "system" (ADR 0005 §1)
  priority?: integer,                 // default 100; lower runs first
  activeFrom?: ISO instant, activeUntil?: ISO instant,   // activeFrom < activeUntil
  eligibility?: { participantIds?: string[],
                  attributes?: { mode: "all" | "any", match: { [dottedPath]: primitive[] } } },
  checkpoints: Checkpoint[],          // 1–50, ids unique within the task (ADR 0005 §2)
  precondition?: Node,                // see below
  outcomes: [{ id, probability, action: { type, ...params } | null }],   // 1–20
  logUnavailable?: boolean            // default true
}
Node = { all: Node[] } | { any: Node[] } | { not: Node }
     | { condition: { type: string, ...params } }
```
### Validation (typed error codes)
| Rule | Code |
|---|---|
| Unknown top-level key | `unknown-field` (reject; no silent ignore) |
| `id`/pattern/uniqueness | `invalid-id`, `duplicate-task-id` |
| `scope` missing/invalid | `invalid-scope` |
| system scope without valid `timeZone`; participant scope with `timeZone` | `invalid-time-zone`, `time-zone-not-allowed` |
| checkpoints empty, > 50, duplicate ids, bad cron/time/offset | `invalid-checkpoint` |
| preference checkpoint with no resolver (static tasks: at construction; dynamic: at load) | `missing-preference-resolver` |
| outcomes empty/> 20, duplicate ids, probability ∉ [0, 1], Σ ≠ 1 (±1e-9) | `invalid-outcomes` |
| precondition depth > 8 or > 100 nodes; empty `all`/`any` | `invalid-precondition` |
| unknown plugin type / plugin `validate` fails | `unknown-plugin-type`, `plugin-params-invalid` |
| `activeFrom ≥ activeUntil` | `invalid-active-range` |
| `eligibility` malformed (bad `mode`, non-primitive allowed values, > 10,000 ids, > 50 paths) | `invalid-eligibility` |

### Semantics
- **Precondition:** `all` = every child met; `any` = at least one; `not` inverts. A node
  whose condition result is `ok: false` makes the decision unavailable with reason
  `condition-error`, whatever the surrounding operators say. Evaluation short-circuits
  left to right. Evaluated conditions appear in the record with their tree `path`
  (e.g. `"all.1.not"`).
- **Built-in condition `time-window`:** `{ type: "time-window", start: {...}, end: {...},
  inclusive?: boolean }`, where each endpoint is `{ reference: "scheduledAt" | dottedPath,
  offset?: { minutes|hours|days }, startOf?: "day"|"week" }`, evaluated in the decision's zone.
  This generalizes legacy `TimeInPeriodCondition` and its `period` helpers.
- **Outcome `action: null`:** an explicit no-intervention arm (MRT control), recorded
  `completed` with no delivery.

### Mapping from the legacy spec (for `contrib/legacy` and anyone reviving it)
| Legacy (`TaskGeneratorHelper.js`, `TaskExecutor.js`) | v1 |
|---|---|
| `label` | `id` |
| `enabled`, `priority` | same (priority ascending, as `getTasksSortedByPriority`) |
| `participantIndependent: true` | `scope: "system"` + explicit `timeZone` (legacy used system user `America/Detroit`) |
| `ignoreTimezone: false` → require user timezone | always required (ADR 0001) |
| `group: {type:"all"}` | no `eligibility` |
| `group: {type:"list", list: usernames}` | `eligibility.participantIds` |
| `group: {type:"group", membership:{g:[v…]}}` (any group matches) | `eligibility.attributes = {mode:"any", match:{"groupMembership.g":[v…]}}` |
| `checkPoints.enabled: false` (**fires every minute**) | `{ cron: "* * * * *" }`, made explicit |
| `pointList[].reference.type:"cron"` + relative offset | `{ cron, offsetMinutes }` (legacy reversed the offset onto "now"; equivalent) |
| `reference.type:"spec"`, `timeStringType:"fixed"`, `timeString` (12-h locale "8:00 AM"), `dateCriteria.weekIndexList` | `{ time: "08:00", daysOfWeek }` |
| `timeStringType:"preference"` (wake/bed via hardcoded `weekdayWakeup`…) | `{ preference: "wakeupTime" }` + app `preferenceResolver` |
| `preCondition: {enabled, conditionRelationship: "and"/"or", conditionList[{type, opposite}]}` | `{ all | any: [ {condition} or {not:{condition}} ] }` |
| `outcomes.randomizationEnabled: false` (always first outcome) | single outcome, `probability: 1` |
| `outcomes.outcomeList[{chance, action}]` | `outcomes[{id, probability, action}]` (ids now required) |
| `preActivationLogging: false` (default) | `logUnavailable: true` (default flips; intended change) |

### Legacy defects deliberately **not** carried over
1. Cron evaluated in the server's zone (ADR 0005).
2. In a `spec` checkpoint, a weekday mismatch on one checkpoint `return`s early and skips
   the task's remaining checkpoints (`TaskExecutor.js:439-441`). In v1, checkpoints are
   independent.
3. Randomness from `hrtime` (ADR 0004).
4. Unawaited actions; conditions never executed (#12, #13 in the plan).
5. Only the first matching checkpoint per minute counted, with no record of which one. v1
   records `checkpointId`, and coincident checkpoints are separate decision points.

## Consequences
- The spec is plain JSON data, storable in any DB, and versioned by content hash (ADR 0004).
- A JSON Schema export is reserved for a later additive release.
