# ADR 0004: Decision record, identity, randomization, delivery

## Context
Legacy task logs drop non-activated decision points unless `preActivationLogging`
(default false), have no decision key, and draw randomness from `process.hrtime()`
(`TaskExecutor.js:209-212`), so allocations cannot be audited or reproduced.

## Decision

### 1. Identity
```
subject    = scope === "system" ? "s:system" : "p:" + participant.id
decisionId = sha256_hex(JSON.stringify(["v1", subject, taskId, checkpointId, scheduledAtISO]))
```
- The `p:` / `s:` prefix prevents a participant whose id is literally `"system"` from
  colliding with system decisions. The fixture shows the two IDs differ.
- `scheduledAtISO` = `Date#toISOString()` (UTC, milliseconds).
- The key names the **decision point**, not the configuration. Editing a task never
  produces a second ID for the same point, so it can never cause a second delivery.

### 2. Task version (recorded, not keyed)
`taskVersion = sha256_hex(canonical(normalizedSpec))`, where `normalizedSpec` is the
validated spec **with defaults applied**. `canonical` is JSON with object keys sorted
recursively, arrays kept in order, and `undefined` members dropped. Key order in the source
therefore does not change the version (fixture).

### 3. Randomization
```
seed  = studySalt ? hmac_sha256_hex(studySalt, decisionId) : decisionId
draw  = random(seed)                       // default: seedrandom(seed)()
armId = first outcome i (declared order) with draw < Σ_{k≤i} probability_k;
        if float error leaves none, the last outcome
```
- This matches legacy selection semantics (`allowance < 0`) but is reproducible.
- `studySalt` (optional engine option, from app config/secrets, never logged) prevents
  predicting arms from public IDs. Without it, anyone with a `decisionId` can recompute the
  draw.
- With a single outcome, no draw is made (`draw: null`).

### 4. Record (v1)
```
{ schema: "time-fit.decision/v1", decisionId, tickId,
  scope, participantId | null, taskId, taskVersion, checkpointId,
  scheduledAt, timeZone, evaluatedAt, latenessMs,
  availability: { available: boolean, reasons: string[],
                  conditions: [{ path, type, ok, met?, evidence?, error? }] },
  randomization: { seedKind: "decisionId" | "hmac", draw: number | null,
                   probabilities: { [outcomeId]: number }, armId } | null,
  action: { type, params } | null,
  state: "unavailable" | "claimed" | "completed" | "failed",
  claimedAt, finishedAt?, result?: { delivery? }, error?: { code, message, stack? },
  snapshot?: object }
```
`reasons` codes include `precondition-not-met`, `condition-error`.

### 5. Pipeline and states
eligibility (ADR 0001, no record) → availability →
- unavailable: `claim` in state `unavailable` (terminal), unless `logUnavailable: false`;
- available: randomize → `claim` in state `claimed` → if `claimed: false`, skip (another
  invocation owns it) → execute (null action = no-op) → `complete` / `fail`.

| From | To | Via |
|---|---|---|
| (none) | `unavailable` | `claim` |
| (none) | `claimed` | `claim` |
| `claimed` | `completed` | `complete` |
| `claimed` | `failed` | `fail` |
| terminal | (no change) | `complete`/`fail` → `applied: false` |

### 6. Delivery semantics (documented prominently for users)
**At most once per `decisionId`, no automatic retry.** A crash between `claim` and
`complete` leaves a `claimed` record with no finish time. It is visible, and it is never
re-sent. The unique claim also prevents duplicates across overlapping serverless or cron
invocations and accidental second processes. No leases, no outbox (non-goals for v1).

## Consequences
- Analysts get one row per eligible decision point, with a reproducible draw.
- `logUnavailable: false` is an explicit opt-out for non-research uses. It trades MRT
  completeness for storage and privacy.
