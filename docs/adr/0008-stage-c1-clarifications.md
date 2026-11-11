# ADR 0008: Clarifications from implementing the kernel (Stage C1)

**Status:** Accepted (2026-09-22). **Adds to (does not reverse):** ADRs 0001, 0005, 0006.

Implementing `packages/core` surfaced details ADRs 0001–0007 left open. Each is now fixed
in code and covered by tests (`packages/core/__test__/`).

## Identifiers and names
- Checkpoint and outcome ids: `^[a-z0-9][a-z0-9._-]{0,63}$` (task ids stay 128 chars).
- Preference names: `^[A-Za-z][A-Za-z0-9_-]{0,63}$` (allows legacy camelCase such as
  `wakeupTime`).

## Additional validation error codes (ADR 0006 table)
| Rule | Code |
|---|---|
| Spec is not a plain object | `invalid-spec` |
| `enabled`/`logUnavailable` not boolean; `priority` not an integer within ±1,000,000 | `invalid-field` |
| More than `maxTasks` specs in a set (the extras are rejected individually) | `task-cap-exceeded` |
| `eligibility` on a `scope: "system"` task | `invalid-eligibility` |
| Outcome without an `action` key (`null` must be explicit for no intervention) | `invalid-outcomes` |

## Instants
`activeFrom`/`activeUntil` must carry an explicit offset (`Z` or `±HH:mm`) and be a real
calendar date: `2026-02-30T09:00:00Z` is rejected. `Date.parse` silently rolls it over
to March 2, so validation uses Luxon. Normalized specs store them as UTC
`toISOString()`, so equivalent instants produce the same `taskVersion`.

## Eligibility attribute paths
Paths read **own properties only**. Segments `__proto__`, `prototype`, and `constructor`
are rejected, so a path can never read through the prototype chain. Each path allows at most
1,000 values. A missing path reads as `undefined`, which never matches an allowed `null`.

## Precondition records
- A condition at the root of the tree is recorded with path `"root"`. Nested paths follow
  ADR 0006 (`"all.1.not"`).
- A plugin result that is not a well-formed `ConditionResult` is recorded as an error with
  code `invalid-condition-result`. It is never treated as met.

## Kernel guard
`occurrences()` refuses windows longer than 31 days (`RangeError`). This bounds work per
call; the engine's catch-up window is at most 24 h (ADR 0005 §3).
