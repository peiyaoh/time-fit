# ADR 0010: Stage D legacy boundary and Prisma adapter

**Status:** Accepted (2026-09-22). **Adds to (does not reverse):** ADRs 0002, 0004,
0007, 0009.

## Decision

- The Walk-to-Joy / fitbit-break app, its legacy packages, ad-hoc scripts, and Mongo Prisma
  schema live under `contrib/legacy/` as private workspaces. They are frozen because the study
  is not running; their behavior and known defects are not repaired in this move. Generic
  legacy conditions are superseded by core's `time-window` condition.
- `@time-fit/storage-prisma` implements the participant, task, and decision-log ports using
  an injected, application-owned `PrismaClient`. It has no module singleton, import-time
  Prisma work, connection lifecycle ownership, or generated client output of its own.
- The adapter writes the ADR 0004 v1 record as JSON plus queryable decision state, claim
  token, and timestamps. `decisionId` is the primary key; unique-conflict handling reads the
  stored token so only a same-token re-claim succeeds. Terminal writes use a `state: claimed`
  predicate and return `{ applied }`.
- The adapter has `@prisma/client` and `@time-fit/core` as peers. An application owns both
  versions and supplies the generated client; the adapter does not import core at runtime but
  is intentionally declared alongside it to make this composition contract visible.
- Dependency-cruiser scans `packages/` only. Legacy is deliberately excluded from its cycle
  rule because preserving the legacy helper/database cycle is part of quarantining behavior;
  published candidates are forbidden from importing it.

## Consequences

Applications merge one of the supplied SQLite/Postgres model fragments into their schema and
generate their own client. SQLite tests generate a custom test-only client under the adapter,
so they cannot replace the legacy Mongo client's `node_modules/.prisma/client` output.
