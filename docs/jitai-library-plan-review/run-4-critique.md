# Run 4 critique of v4 (Claude in the critic role; Codex unavailable)

Focus: internal consistency of v4 after three rounds of edits, plus scale and data-model
problems that only show up when §3.4–3.6 are read together.

## 1. Internal contradictions (must fix before "final")
1. **§3 diagram is stale.** It still lists `contrib/*` as "DatabaseUtility, app-utils, …"
   and omits `time-engine`, `helper`, `database`, `action-collection`, which Stage D moves to
   `contrib/legacy`.
2. **The §3.2 ports table lacks `recordGap?`,** which §3.4 calls. It also says the resolver is
   "checked at registration", while §3.5 says specs are "validated at load".
3. **`fromLegacyPlugin()` sits in two places.** §3.3 puts it in core; Stage D′ puts it in contrib.
   Core should not carry legacy shapes, so contrib is the right home.
4. **The preference-resolver check cannot happen at construction.** Tasks can arrive from a
   dynamic `tasks` port, so the engine only learns a task needs a resolver when it loads
   the task during a tick. Rule: static `tasks` are checked at construction. A dynamically loaded
   task that needs a missing resolver is rejected at load with a
   `task-invalid: missing-preference-resolver` log. The engine keeps running other tasks.
5. **take-a-break's migration point is unstated.** It uses `DesktopNotificationAction`.
   Stage D moves `action-collection` to contrib, and the desktop action only reappears in Stage E,
   so take-a-break must stay on legacy until E. Say so, and make "take-a-break on core" an
   acceptance item of E.

## 2. Design flaws

### 2.1 Group-as-condition + "log every decision point" = record explosion
Run 2 moved group membership into a condition. v4 also logs every decision point,
including unavailable ones. Together, a task for a 50-person arm in a 10,000-participant
deployment writes **10,000 records per occurrence**, and 9,950 of them just say "not in
group". That is also wrong for MRT analysis. Participants outside the target population are
**ineligible**, not **unavailable**, and should not appear in the decision table at all.
**Fix:** split the pipeline into:
- **Eligibility**, with no record: scope, `activeFrom`/`activeUntil`, a spec-level
  `eligibility` filter (group membership, study phase). This is evaluated before claim and
  can be pushed down to the adapter later.
- **Availability**, recorded: the precondition tree. An unavailable decision is recorded with
  reason codes.
Group membership returns to a spec field (`eligibility: { group: ... }`) with a built-in
evaluator, not a condition plugin.

### 2.2 Randomization is not reproducible
Legacy seeds from `process.hrtime()` (`TaskExecutor.js:209-212`), so no draw can be
re-derived. v4 says "seed recorded in decision" but does not define the seed. **Fix:**
`seed = decisionId` (optionally salted with a per-study secret, so arms cannot be predicted
from public IDs). A re-run after a crash then reproduces the same arm, and analysts can
audit allocations.

### 2.3 Claim order is undefined
§3.4 defines states but not *when* `claim` happens relative to condition evaluation and
randomization. **Fix:** eligibility → availability evaluation → `claim(decision with
availability + arm)` → execute → `complete`/`fail`. Unavailable decisions are written with one
`claim` in terminal state `unavailable`. That needs a 4th state, which v4 lacks.

### 2.4 Scale: enumeration cost per tick
§3.4 enumerates occurrences per participant × task on every tick. Legacy does the same
per minute (`isCheckPointForUser`, `TaskExecutor.js:400+`). For 10k × 20 that means about 200k cron
evaluations per minute, even when nothing is due. **Fix:** make occurrence computation a pure
function `occurrences(checkpoint, zone, window)`. Memoize it per
`(taskVersion, checkpointId, zone, window)` within a tick, because participants share
zones. Only preference checkpoints are truly per-participant.

### 2.5 `storage-prisma` has a provider problem
A Prisma schema is provider-specific (the study uses `provider = "mongodb"`,
`prisma/schema.prisma:9`), and a library cannot ship a generated client. v4's "small
library-owned Prisma schema" is ambiguous about who runs `prisma generate` and on which
provider. **Fix:** the adapter takes an injected `PrismaClient` (dependency injection, no
module-level singleton). It ships **schema fragments** for SQLite/Postgres to merge into the
app's schema, and it is tested in CI on SQLite, with no Docker. Mongo support is documented for D′ only.

## 3. Smaller gaps
- **Correlation IDs:** state that `decisionId` is the correlation ID on every log event
  inside a decision, and `tickId` on tick-level events.
- **Stage A `/api/cron` test:** Prisma-on-Mongo needs a replica set. The repo already uses
  `MongoMemoryReplSet` (`packages/helper/__test__/Prisma.test.js:11`); reuse that
  harness.
- **Legacy `randomizationEnabled: false`** (`TaskExecutor.js:182`) must appear in the
  §3.6 mapping as "single outcome with probability 1".

## 4. Top recommendations
1. Eligibility vs. availability split. Group becomes eligibility, with no records for ineligible participants.
2. `seed = decisionId (+ optional salt)`. Define claim order, and add the `unavailable` state.
3. Fix the five contradictions in §1.
4. Memoize occurrences per zone.
5. `storage-prisma`: injected client, schema fragments, SQLite in CI.

**Score: 8/10.** Structurally sound and appropriately cut. The remaining issues are
contract-level, and they would be expensive to change after Stage C ships.
