# ADR 0011: Injected integrations and database-free take-a-break

**Status:** Accepted (2026-09-22). **Adds to (does not reverse):** ADRs 0003, 0007, 0009,
0010.

## Decision

- `@time-fit/integrations` exports only `./desktop`, `./twilio`, and `./mailjet`; it has no
  root barrel. This prevents importing the desktop integration from loading unrelated provider
  modules and lets a packed consumer install desktop without Twilio or Mailjet SDKs.
- Factories accept application-constructed clients/notifiers. The package imports no vendor
  SDK, reads no environment variable, and therefore declares no optional vendor peer; an app
  declares the SDK it chooses to construct.
- Mailjet maps `ctx.decisionId` to `CustomID`. Twilio Messages has no idempotency or safe
  correlation field in this action shape, so it receives no invented provider field; its return
  payload records `decisionId` alongside `sid` and status. A pre-aborted signal prevents a
  request, but neither supported SDK method offers in-flight cancellation in this interface.
- `apps/take-a-break` is a system-scope core task with an explicit `America/Detroit` zone,
  memory storage, and an injected desktop action. CI invokes one fixed tick with a fake
  notifier rather than relying on timer timing or Prisma.

## Consequences

Provider errors and missing recipient paths return typed ActionResults. Core remains unchanged,
and integrations is covered by the same package boundary, dependency scan, and packed-tarball
checks as the other published candidates.
