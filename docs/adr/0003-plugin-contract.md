# ADR 0003: Condition and Action plugins

## Context
Legacy plugins come in two shapes: classes with `static async execute` (`HelloAction`,
`NoAction`, `TimeInPeriodCondition`) and instances (`take-a-break` registers
`new DesktopNotificationAction(...)`). Conditions return `{result, recordInfo}`; actions
return arbitrary values. The executor never awaited actions (`TaskExecutor.js:197`), and
passed an undefined variable to conditions (`:341`).

## Decision
```js
/** Condition */ { type: string, validate?(params) → Result<void>,
                   evaluate(params, ctx) → Promise<ConditionResult> }
ConditionResult = { ok: true, met: boolean, evidence?: object } | { ok: false, error }
/** Action */    { type: string, validate?(params) → Result<void>,
                   execute(params, ctx) → Promise<ActionResult> }
ActionResult    = { ok: true, delivery?: object } | { ok: false, error }
ctx = { decisionId, taskId, checkpointId, scheduledAt: Date, participant | null,
        logger /* pre-bound with correlation fields */, signal: AbortSignal }
```
- **Plain immutable objects.** No classes are required. Factories such as
  `desktopNotification({ title })` return plugin objects, and the engine freezes them on
  registration.
- **Registration.** `type` is `^[a-z][a-z0-9-]{0,63}$`. Duplicate types (including collisions
  with built-ins) fail construction. The built-in condition is `time-window` (ADR 0006).
- **Validation.** At task load, `validate(params)` runs for every condition/action node that
  names the plugin. Failure makes the task invalid (`task-invalid`, code
  `plugin-params-invalid`). An unknown `type` → `unknown-plugin-type`.
- **Isolation.** A plugin that throws/rejects is converted to `{ ok: false, error: { code:
  "plugin-threw", ... } }`. A plugin exceeding `options.pluginTimeoutMs` (default 30,000)
  gets `ctx.signal` aborted and yields `{ ok: false, error: { code: "plugin-timeout" } }`.
  *An action that times out may still deliver later.* The record says `failed` with
  `plugin-timeout`, and the docs must state this plainly.
- **Condition errors.** A condition returning `ok: false` makes the decision
  **unavailable** with reason `condition-error` (never "met").
- **Size caps.** `evidence` and `delivery` are truncated past 8 KB serialized, with
  `truncated: true`.
- **Batch evaluation** (`evaluateBatch`) is **reserved**. The name is documented here,
  but it is not part of the v1 type. It will be added only when the engine calls it.

## Consequences
- The legacy class/instance shapes are adapted by `fromLegacyPlugin()` in
  `contrib/legacy`, never in core.
- Actions receive `decisionId`, so a delivery integration can pass it to a provider's
  idempotency or reference field.
