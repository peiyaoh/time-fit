# @time-fit/core

TimeFit's ESM decision engine for time-based JITAIs. Define decision points, provide storage
ports and plugins, then call `tick()` from your scheduler. Node 20+ required. TimeFit is not yet
published to npm; until first release, clone this repository, run `yarn install`, and try
`examples/quickstart` or `yarn example1`.

After release:
```sh
npm install @time-fit/core
```

## Minimal example

This is the runnable [`examples/quickstart`](../../examples/quickstart/index.mjs):

```js
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";

const store = createMemoryStore({ participants: [{ id: "ada", timeZone: "America/Detroit" }] });
const printReminder = {
  type: "print-reminder",
  execute: async ({ message }, { participant, scheduledAt }) => {
    console.log(`[${scheduledAt.toISOString()}] to ${participant.id}: ${message}`);
    return { ok: true, delivery: { channel: "console" } };
  },
};
const engine = createTimeEngine({
  storage: store,
  actions: [printReminder],
  tasks: [{
    id: "stretch-break", scope: "participant",
    checkpoints: [{ id: "mid-morning", time: "10:30", daysOfWeek: [1, 2, 3, 4, 5] }],
    outcomes: [
      { id: "remind", probability: 0.5, action: { type: "print-reminder", message: "Time to stretch!" } },
      { id: "control", probability: 0.5, action: null },
    ],
  }],
});
await engine.tick(new Date("2026-09-22T14:30:00Z"));
```

## Core concepts

A task has a participant or `system` scope, ordered checkpoints, optional eligibility, an
optional precondition tree, and outcomes. Participant tasks use each participant's IANA time
zone; system tasks declare their own `timeZone`. Checkpoints are `cron`, fixed `time`, or a
preference resolved by your app. Eligibility selects the population and produces no record for
an excluded participant. Availability is the precondition tree; eligible unavailable decisions
are recorded unless `logUnavailable: false`.

Preconditions compose `{ all: [...] }`, `{ any: [...] }`, `{ not: ... }`, and
`{ condition: { type, ...params } }`. Outcomes have probabilities summing to one; `action: null`
is an explicit control arm. TimeFit derives a reproducible randomized arm and creates a decision
record containing its identity, task version, scheduling/availability, allocation, and delivery
or failure result. See [task-spec ADR](../../docs/adr/0006-task-spec.md) and
[decision-record ADR](../../docs/adr/0004-decision-record-identity-delivery.md).

## Ports and plugins

Supply `storage` with `participants.iterate({ cursor, limit })`, either static `tasks` or
`tasks.listActive(at, { windowFrom })`, and `decisionLog.claim/complete/fail` (optional
`recordGap`). You may override any of those ports directly. Optional ports are `clock`, `random`,
`logger`, `preferenceResolver`, and `snapshot`. A tasks port that filters by an end date should
keep tasks whose `activeUntil` is after `windowFrom` (the start of the tick's evaluation window),
not after `at`; otherwise an occurrence just before a task's end is skipped when the tick runs
after it. The [ports ADR](../../docs/adr/0002-ports.md) and
[ADR 0013](../../docs/adr/0013-pre-release-engine-contract-fixes.md) define the exact contract; `@time-fit/core/memory` is for tests, demos, and short-lived reminders—not
research data.

Register immutable plugin objects. A Condition has `type`, optional `validate(params)`, and
`async evaluate(params, ctx)` returning `{ ok: true, met, evidence? }` or `{ ok: false, error }`.
An Action similarly exposes `async execute(params, ctx)` and returns `{ ok: true, delivery? }` or
`{ ok: false, error }`. `ctx` includes `decisionId`, task/checkpoint IDs, `scheduledAt`, zone,
participant, correlated logger, and `AbortSignal`. See [plugin ADR](../../docs/adr/0003-plugin-contract.md).

## Running and options

`await engine.tick(now)` is primary: use it from cron, serverless, or tests. `engine.start()` is
only an in-process minute timer; call `await engine.stop()` to stop it. A process never overlaps
its own ticks, while atomic decision-log claims protect overlapping ticks and separate processes.

Defaults: `catchUpWindowMinutes: 5`, `concurrency: 1`, `pageSize: 100`, and
`pluginTimeoutMs: 30_000`. Start I/O-bound deployment tuning near concurrency 8, measure it, and
keep `pageSize` at least four times concurrency to avoid underfilled page waves. Concurrency is
1–64; it preserves order within each participant, not across participants. See the
[performance benchmark](../../docs/stage-f-review/README.md), [calendar ADR](../../docs/adr/0005-calendar-and-scheduling.md), and [engine clarifications](../../docs/adr/0009-stage-c2-engine-clarifications.md).

Read [delivery guarantees](../../docs/guides/delivery-guarantees.md) and
[privacy guidance](../../docs/guides/privacy.md) before a study deployment. Generated `.d.ts`
files in each package tarball are the API reference. The root export also provides the public
contract types, such as `EngineConfig`, `TickResult`, `DecisionRecord`, the port types, and
`ActionPlugin<Params>`.

## Kernel API

`createTimeEngine` is built on pure functions that are also exported, for applications that
validate stored specs, analyze decision records, or test scheduling without running an engine.
None of them do I/O. Their contracts are defined by the ADRs listed here.

| Exports | Use | Contract |
|---|---|---|
| `validateTaskSpec(spec, context)`, `validateTaskSet(specs, context, { maxTasks })` | Validate a task spec before storing it. `context` is `{ conditionTypes, actionTypes, hasPreferenceResolver }`, where the two registries are `Map`s from plugin `type` to the plugin (only its optional `validate` is called). Returns `Result` with a frozen, normalized spec. | [ADR 0006](../../docs/adr/0006-task-spec.md) |
| `validateEligibility(eligibility)`, `validateOutcomes(outcomes, context)`, `validatePrecondition(node, context)` | Validate one section of a task spec. The last two take the same `context` as `validateTaskSpec`. | ADR 0001, 0006 |
| `evaluateEligibility({ task, participant, scheduledAt })`, `evaluatePrecondition(node, evaluateCondition)`, `readOwnPath(source, dottedPath)` | Evaluate eligibility and a precondition tree. `evaluateCondition(condition, path)` returns a promise of a condition result. `readOwnPath` reads own properties only. | [ADR 0001](../../docs/adr/0001-participants-eligibility-availability.md), [ADR 0008](../../docs/adr/0008-stage-c1-clarifications.md) |
| `normalizeCheckpoint`, `checkpointKind`, `localDatesForWindow`, `occurrences` | Normalize checkpoints and list their occurrences in a time window and zone. | [ADR 0005](../../docs/adr/0005-calendar-and-scheduling.md) |
| `computeDecisionId`, `decisionSubject`, `computeTaskVersion`, `DECISION_ID_VERSION`, `canonicalJson` | Recompute decision ids and task versions, for example to join records with schedules in analysis. | [ADR 0004](../../docs/adr/0004-decision-record-identity-delivery.md), ADR 0008 |
| `randomize`, `selectArm`, `deriveSeed`, `seededRandom` | Reproduce or audit an arm assignment from a decision id. | ADR 0004 §3 |
| `isValidTimeZone`, `ok`, `err` | IANA zone check and the `Result` helpers that every validator returns. | [ADR index](../../docs/adr/README.md) |
| `EngineConfigError`, `DECISION_RECORD_SCHEMA`, `timeWindowCondition` | The configuration error type, the record schema id, and the built-in `time-window` condition. | ADR 0002-0004, 0006 |

These are public API and follow semantic versioning like the engine. The stability policy for the
first releases is an owner decision recorded in the
[release checklist](../../docs/release-checklist.md).
