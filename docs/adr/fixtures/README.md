# Contract fixtures

These are the executable form of ADRs 0001–0007. Stage C1 moves them to
`packages/core/test/fixtures/` (keeping this README), and core's tests load every case.
An implementation that fails a fixture is wrong; if a fixture turns out to be wrong,
change it together with an ADR update.

| File | Consumer | Covers |
|---|---|---|
| `calendar.json` | C1 `occurrences()`, zone validation | ADR 0005: DST gap/fold, offsets, date line, day filters, window bounds, zones |
| `identity.json` | C1 identity / version / seed / arm selection | ADR 0004 goldens |
| `task-spec-validation.json` | C1 `validateTaskSpec()` | ADR 0006 error codes |
| `engine-scenarios.json` | C2 engine + memory store | ADR 0001–0005 end to end |

Generated values (occurrence instants, hashes, draws) were computed on 2026-09-22 with
`cron-parser` 5.0.6, `luxon` 3.6.0, `seedrandom` 3.0.5, and `node:crypto`. Spot checks were
done by hand; they are noted inline.

## Fixture plugins (tests must register these)
**Conditions.** Every one supports `validate(params)`, which fails when
`params.rejectParams === true`.
| type | behavior |
|---|---|
| `fixture-met` | `{ ok: true, met: true }` |
| `fixture-not-met` | `{ ok: true, met: false }` |
| `fixture-error` | `{ ok: false, error: { code: "fixture-error", message: "…" } }` |
| `fixture-throws` | throws `new Error("fixture condition threw")` |

**Actions.**
| type | behavior |
|---|---|
| `fixture-record` | appends `{ taskId, decisionId, params }` to a test-visible call log; returns `{ ok: true, delivery: { callIndex } }` |
| `fixture-throws` | throws `new Error("fixture action threw")` |
| `fixture-gate` | awaits a promise the test resolves with the `releaseGate` step, then behaves like `fixture-record` |

## Scenario steps (`engine-scenarios.json`)
| step | meaning |
|---|---|
| `{ tick: iso }` | `await engine.tick(new Date(iso))`; the clock port also returns `iso`, so `evaluatedAt = iso` |
| `{ tickWithoutAwait: iso }` | start a tick and keep its promise pending |
| `{ awaitPending: true }` | await all pending tick promises |
| `{ restart: true }` | build a new engine instance over the **same** store (in-memory `lastTick` is lost) |
| `{ replaceTask: spec }` | replace the task with the same `id` in the store |
| `{ concurrentTicks: { engines, sharedStore, now } }` | build N engines over one store and `Promise.all` their ticks |
| `{ releaseGate: true }` | resolve `fixture-gate` |

`expect.records` is the **complete** set of records in the store after the last step.
`actionCalls` counts `fixture-record`/`fixture-gate` executions. `summary` fields are
asserted against the last tick's summary unless the key says otherwise.
