# Architecture Decision Records: `@time-fit/core` v1 contract

Stage B of [`../jitai-library-plan.md`](../jitai-library-plan.md). These records are the
contract that Stage C1 (pure kernel) and C2 (engine) implement. The fixtures in
[`fixtures/`](fixtures/) are the executable form of the contract: C1/C2 tests load them,
and an implementation is correct when every fixture passes.

| ADR | Decision |
|---|---|
| [0001](0001-participants-eligibility-availability.md) | Opaque participants; eligibility (no record) vs. availability (recorded) |
| [0002](0002-ports.md) | Ports the engine depends on, their shapes, and failure behavior |
| [0003](0003-plugin-contract.md) | Condition and Action plugin contract |
| [0004](0004-decision-record-identity-delivery.md) | Decision record, `decisionId`, randomization, at-most-once delivery |
| [0005](0005-calendar-and-scheduling.md) | Time zones, checkpoints, DST, enumeration window, catch-up |
| [0006](0006-task-spec.md) | Task spec shape, validation limits, and mapping from the legacy spec |
| [0007](0007-packaging-and-names.md) | Package layout, names, runtime targets |

**Status of all ADRs: Accepted (2026-09-22).** To change an accepted decision, add a new
ADR that supersedes it. Do not rewrite an accepted ADR.

Conventions used throughout:
- `Result<T>` = `{ ok: true, value: T } | { ok: false, error: { code: string, message: string, details?: object } }`.
  Error `code`s are stable kebab-case strings and part of the public API.
- All instants are ISO-8601 UTC with milliseconds (`Date.prototype.toISOString()`).
- Every collection the engine accepts or produces has a documented cap.
