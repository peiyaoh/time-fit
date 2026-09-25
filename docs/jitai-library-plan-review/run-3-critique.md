# Run 3 critique of v3 (by Claude in the critic role; Codex was unavailable)

> **Provenance.** Codex started Run 3 (it got as far as the npm lookup) but hit its
> usage limit before writing anything. At the user's request Claude took over the critic role for
> Runs 3–5. To offset self-review bias, this critique argues against Claude's own Run 2
> pushbacks first and cites evidence re-checked on the branch today.

## 1. Rebuttal of the Run 2 pushbacks

**(a) No durable watermark: CONCEDE with one amendment.** With an idempotent `claim`,
re-enumerating after a restart is safe. The gap is a stall *longer* than
`catchUpWindow` (laptop sleep, host outage, a hung adapter). Those occurrences are
dropped with no trace, and an MRT analysis would read them as never scheduled.
**Amendment:** when a tick's `now − lastTick > catchUpWindow`, emit a structured
`scheduler.missed-window` log event with the uncovered interval. Optionally let the
`decisionLog` port record it with `recordGap(from, to)`. That keeps the no-watermark design
and makes the loss visible.

**(b) `taskVersion` = content hash inside `decisionId`: COUNTER. This is a real defect.**
With `taskVersion` inside the identity key, a cosmetic edit (message wording, priority, a
typo fix) during the catch-up window, or between a crash and restart, produces a *new*
`decisionId` for the same participant, checkpoint, and instant. `claim` then succeeds a
second time and the participant gets a **duplicate intervention**, which is exactly the
failure the key exists to prevent. The identity must describe *which decision point*
this is, not *which configuration evaluated it*.
**Fix:** `decisionId = sha256(["v1", scope|participantId, taskId, checkpointId,
scheduledAtISOUTC])`. Keep `taskVersion` as a recorded field only. Two more
corrections follow:
- `checkpointIndex` is fragile too. Reordering the checkpoint array changes identity, so the
  spec must require a stable **`checkpoint.id`**.
- **RFC 8785 is over-engineering here.** The identity input is an array of strings, and
  `JSON.stringify` of an array of strings is already deterministic. `taskVersion`
  needs a sorted-key stringify of the validated spec, which is about 10 lines. Drop the RFC 8785 dependency.

**(c) No leases: CONCEDE, with a correction to the premise.** The "single scheduler process"
premise does not hold for `apps/fitbit-break`. Its scheduler is an HTTP handler,
`apps/fitbit-break/pages/api/cron.js:54` (`export default async function handler(req, res)`),
triggered externally. Serverless or cron invocations can overlap, and v3's in-process in-flight
guard does nothing across invocations. The unique `claim` still prevents duplicate delivery,
so leases remain unnecessary. The plan should state this explicitly and make
**`tick(now)` a first-class entry point**, with `start()` as convenience sugar, not a
testing-only hook.

**(d) `validate()` instead of JSON Schema: CONCEDE.** One cost: without a
machine-readable task schema, no external tool (a study-config UI, a linter) can validate
specs. Record this as a deferred, additive option: export a JSON Schema from core later
without changing the validator.

**(e) New `decision` collection: CONCEDE.** The façade then writes `taskLog` and
`decision` in two non-atomic writes, which can diverge on a crash. That is acceptable because
`taskLog` becomes display-only legacy data. Document it so nobody treats `taskLog` as the
record of truth.

**(f) No compatibility shims: CONFIRMED.** `npm view @time-fit/time-engine name` →
`npm error code E404 … 404 Not Found - GET https://registry.npmjs.org/@time-fit%2ftime-engine`.
Nothing is published, so no semver obligation exists. **New risk:** the plan never secures
the npm scope. If the `@time-fit` org is not owned by the maintainer, every package name
in the plan may be unpublishable. Claim the scope (or choose names) in Stage B, not Stage H.

## 2. New defect found while verifying (c)

**`apps/fitbit-break/pages/api/cron.js` calls a method that does not exist.** Around
line 93 it calls `TaskExecutor.executeTaskForUserListForDatetime(...)` twice, but the only
method is `executeTaskForUserListForDate` (`packages/time-engine/TaskExecutor.js:29`). Stage 1
repointed the *imports*, and `next build` passes because it does not execute route bodies,
but every cron invocation still throws `TypeError` at runtime. The
`refactor-plan.md` Stage 1 requirement ("the smoke job must actually invoke
`/api/cron`") was never met. Current CI only runs `next build` (`.github/workflows/ci.yml:29-52`).
This file also duplicates the engine's scheduling loop (its own `executeTask`, user query,
weekday/weekend helper, and system-user branch), so fitbit-break is **a second
composition of the executor**, not a consumer of `TimeEngine`. Stage D's "fitbit-break
wires storage-prisma via the façade" understates that migration.

## 3. Solo-maintainer feasibility

| Stage | Effort | Notes |
|---|---|---|
| A correctness gate | M | Now also includes the `cron.js` method name and a real `/api/cron` invocation test |
| B contract/ADRs | M | Write the ADRs as short decision records, not essays |
| C thin core | **XL** | Includes the executor port, memory adapter, conformance suite, and legacy plugin adapter |
| D façade + Prisma | **L, riskiest** | Touches a live study DB and has two compositions to migrate (`TimeEngine` + `cron.js`) |
| E boundaries | L | Mostly mechanical moves, but many files |
| F integrations | M | |
| G performance | M | |
| H release | M | |

The total is too large for one maintainer to finish without a long gap. **Cuts and deferrals:**
1. **Decide whether fitbit-break migrates at all.** If the Walk-to-Joy study is finished
   or frozen, the cheapest correct path is to **freeze it on the legacy engine** by moving
   `time-engine`, `helper`, and `database` into `apps/fitbit-break` (or `contrib/legacy`),
   unpublished and untouched. Then build core fresh, proven only by `take-a-break` and new
   examples. This removes most of Stage D (façade, legacy plugin adapter, Mongo index
   rehearsal) and the Stage C "legacy scenario suite via harness." It is the single
   largest scope cut available, and it depends on a fact only the user knows.
2. **Conformance suite:** keep it (it is what makes third-party adapters trustworthy), but
   cut the "crash-at-boundary simulations" down to state-transition tests. A crash is just a
   `claim` with no `complete` or `fail`, and one test covers it.
3. **Stage G folds into C.** In-flight guard, bounded concurrency (default 1), and pagination
   belong in the core design from day one, because retrofitting concurrency changes ordering
   semantics. What remains of G is the benchmark script, which moves into H.

**Under-engineered:**
- **The task-spec shape is missing from v3.** v2's Stage D mentioned a task-spec
  schema, but v3 §3 defines participants, ports, plugins, and identity, and never the
  thing developers write most: checkpoints (with `id`), scope, group, precondition tree
  (`AND`/`OR`, `not`), outcomes (probabilities that must sum to 1), and `activeFrom`/`activeUntil`.
  The existing executor semantics (`TaskExecutor.js:259-333` for preconditions,
  `:181-236` for randomized outcomes) must be captured in an ADR, or the port in Stage C will guess.
- **Performance where it actually matters.** Per-participant conditions that query a DB
  create an N+1 pattern (the legacy `others/*` conditions query task logs per user). Reserve an
  optional, additive `evaluateBatch(spec, participants, ctx)` on `Condition` in the
  contract now, implemented later. Concurrency alone just moves the load onto the database.

## 4. Sequencing and hidden dependencies
- **D before E is inconsistent.** In v3, Stage D moves Prisma queries out of `helper` into
  `storage-prisma` while `apps/*` still import them from `helper` (dozens of deep imports,
  for example `apps/fitbit-break/pages/dashboard.js`). The move either breaks apps or
  duplicates code. Either create `storage-prisma` in D by *importing* from `helper`
  temporarily and move the code in E, or merge D and E's persistence moves.
- **F depends only on C**, so it can proceed in parallel with D/E.
- **Stage A's scenario suite versus D's executor deletion:** the suite must target the
  façade's public API (`TimeEngine.register*`, `processClock`), not `TaskExecutor` internals.
  Otherwise deleting the executor also deletes the tests that protect the migration. State
  this in Stage A.

## 5. Developer experience: quickstart under v3

```js
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotification } from "@time-fit/integrations/desktop";

const store = createMemoryStore({ participants: [{ id: "me", timeZone: "America/Detroit" }] });
const engine = createTimeEngine({
  participants: store.participants, tasks: store.tasks, decisionLog: store.decisionLog,
  actions: [desktopNotification({ title: "TimeFit" })],
});
await store.tasks.add({
  id: "take-a-break", scope: "system",
  checkpoints: [{ id: "every-30", cron: "*/30 * * * 1-5" }],
  outcomes: [{ probability: 1, action: { type: "desktop-notification", message: "Take a break!" } }],
});
engine.start();            // or: await engine.tick(new Date()) from an external cron
```

Awkward points to fix in the plan:
1. Three ports from one store are passed separately. Accept `storage: store` (an object
   exposing all ports), with per-port overrides.
2. Most developers define tasks in code. Accept `tasks: TaskSpec[]` directly and wrap it
   in a static `tasks` port internally. Requiring a store for static config is friction.
3. `scope: "system"` versus participant tasks must be explicit in the spec (see §3).
4. Serverless users need `tick()`, which must be documented as primary (see 1c).

## 6. Top 5 recommendations (ranked)
1. **Remove `taskVersion` from `decisionId`; require stable `checkpoint.id`; drop RFC 8785.**
   The current key can cause duplicate interventions.
2. **Add the `cron.js` runtime bug to Stage A and actually invoke `/api/cron` in CI.**
   Recognize `cron.js` as a second composition root to migrate or freeze.
3. **Put a decision gate ahead of Stage D: migrate fitbit-break or freeze it on legacy.**
   Default recommendation: freeze, unless the study is still live and will receive new
   features.
4. **Add a task-spec ADR (§3.6) and reserve `Condition.evaluateBatch`.** Fold scheduler
   concurrency (G) into C.
5. **Fix the DX:** accept `storage` and static `tasks` in the config, make `tick()` first-class,
   claim the npm scope in Stage B, and resolve the D/E ordering.

**Score: 7/10.** The architecture holds, but the identity key has a duplicate-delivery hole,
the task spec (the main developer-facing contract) is missing, and the plan's biggest
cost, the fitbit-break migration, has not been justified.
