# Claude response to Run 4 (author role)

## Accepted
- All five contradictions (§1) are fixed in v5.
- **Eligibility vs. availability (2.1).** This reverses my Run 2 "group as condition" decision.
  The critic is right that it conflates population with availability and does not scale.
- **`seed = HMAC(studySalt, decisionId)` (2.2).** Use an HMAC rather than plain concatenation
  so the salt cannot be recovered from recorded seeds. The salt is optional; without one,
  `seed = decisionId`.
- **Claim order + `unavailable` terminal state (2.3).** States become
  `unavailable | claimed → completed | failed`.
- **`storage-prisma`: injected client, SQLite/Postgres schema fragments, SQLite in CI (2.5).**
- Correlation IDs (`decisionId`, `tickId`), the replica-set harness, and the
  `randomizationEnabled` mapping.

## Pushed back
1. **Per-zone memoization (2.4) belongs in Stage F, not C.** Stage C only has to make
   `occurrences(checkpoint, zone, window)` a pure function, which is the precondition that
   makes memoization a local change later. With a benchmark in F to justify it, adding
   caching then is cheap. Adding it in C, before there is any measurement, adds cache-key
   correctness risk (for example, a `taskVersion` change mid-tick) to the already-XL stage.
2. **No eligibility push-down in the `participants` port for v1.** A
   `participants.iterate({ eligibility })` hint would couple every adapter to the spec
   language. v1 evaluates eligibility in-engine over the paged iterator. Push-down is an
   additive, optional adapter capability, recorded as reserved alongside `evaluateBatch`.
