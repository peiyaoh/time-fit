# Claude response — Run 1

Verified Codex's two new defects directly:
- `TaskExecutor.checkOneConditionForUser(condition, userInfo, dateTime)` passes undeclared
  `datetime` (`packages/time-engine/TaskExecutor.js:341`) → `ReferenceError` on the first
  condition evaluation. The fact that 88 tests pass means **no test executes a condition
  through the executor** — a coverage hole, not just a bug.
- `executeActionForUser` stores `execute(...)` without `await` (`TaskExecutor.js:197`);
  every `execute` in `action-collection` is `async`, so `executionResult` is always a
  Promise and action rejections are unhandled.

Additional finding while verifying: the action plugin contract is inconsistent —
`take-a-break` registers an **instance** (`new DesktopNotificationAction(...)`), while
`HelloAction`, `NoAction`, `MessageLabelAction` etc. expose `static async execute`. The core
contract must pick one shape.

## Accepted
| # | Codex recommendation | Integration in v2 |
|---|---|---|
| 1 | Stage A as a correctness gate | Stage A now lists all 6 engine defects + metadata faults + deterministic tick smoke |
| 3 | Calendar semantics before perf | Stage B (contract) specifies DST gap/fold, zone, catch-up with table tests |
| 4 | Thin-core slice instead of big B/C split | New `packages/core` built fresh; legacy `TimeEngine` routed through it later; helper split only as needed |
| 5 | Fewer packages + packed-consumer acceptance | 3 publishable units: `core`, `storage-prisma`, `integrations` (subpath exports, optional peers); `npm pack` fixture test in CI |
| — | Benchmark non-gating | Accepted: report-only |
| — | Correct partial claims (4, 7, 10) | Corrected in plan §1 |

## Pushed back
1. **Rec 2 (decision-record + idempotency as the first contract) — accepted in part.**
   A deterministic `decisionId`, logging every decision point (availability + reason codes,
   allocation probabilities, chosen arm), and a *claim-before-act* port method are in
   scope, because MRT analysis is the reason this library exists. A **transactional outbox
   and provider idempotency keys are not** v1 core requirements: the target deployment is a
   single scheduler process per study, the core cannot make Twilio/Mailjet idempotent, and
   an outbox forces every adapter author to implement a queue. v1 contract: at-most-once
   *per decisionId* enforced by the adapter's unique constraint on claim; actions receive the
   `decisionId` so an integration *may* pass it as a provider idempotency key. Outbox is a
   documented extension point, not a requirement.
2. **"Replace the default resolver with an explicit failure" — only in the new core.** The
   legacy `TimeEngine` façade must keep today's behavior for `apps/fitbit-break` (fix the
   import, emit a deprecation warning); breaking it inside a correctness PR violates
   "deprecate before removing". The new `createTimeEngine` requires a resolver when a task
   uses `preference` checkpoints and fails at registration time, not at tick time.
3. **`preActivationLogging` default.** Logging all decision points becomes the default only
   in the new core; the legacy façade keeps the stored per-task flag so fitbit-break's log
   volume and dashboards do not change silently.
