# @time-fit/storage-prisma

Prisma implementation of the `participants`, `tasks`, and `decisionLog` ports from
`@time-fit/core`. Supply an application-owned, generated `PrismaClient`:

```js
import { PrismaClient } from "@prisma/client";
import { createPrismaStorage } from "@time-fit/storage-prisma";

const prisma = new PrismaClient();
const storage = createPrismaStorage({ prisma });
```

There is no singleton and importing this package does not connect to a database. Merge either
`prisma/schema.sqlite.prisma` or `prisma/schema.postgres.prisma` into the application's schema,
generate that application's client, and retain the four model names. `Task.spec` stores the
core task spec; mirror its `activeFrom` and `activeUntil` fields in the scalar columns to make
`listActive` bounded and queryable.

`listActive(at, { windowFrom })` returns tasks that started by `at` and had not ended by
`windowFrom`, the start of the engine's evaluation window, so a task that ended inside the window
still gets its earlier occurrences evaluated. At most `maxTasks` candidate tasks are allowed
(default 500, up to 10,000):

```js
const storage = createPrismaStorage({ prisma, maxTasks: 2000 });
```

If more rows match, `listActive` throws an error with code `task-capacity-exceeded`, and the tick
aborts at stage `tasks` instead of silently skipping tasks. This is a cap on candidates read from
the database. The engine's own `options.maxTasks` (default 500) separately caps how many tasks it
evaluates, so set the adapter's `maxTasks` at least as high as the engine's.

`Decision.decisionId` is the unique atomic claim key. A same-token re-claim succeeds; a
different token is refused; terminal transitions update only a claimed record. This gives core's
at-most-once delivery semantics, not delivery retry semantics.

## Databases

| Database | Schema fragment | Status |
|---|---|---|
| SQLite | `prisma/schema.sqlite.prisma` | Schema validated; the adapter and decision-log conformance suites run against it in CI. |
| PostgreSQL | `prisma/schema.postgres.prisma` | Schema validated only. The conformance suites run on SQLite only, so run `decisionLogConformanceChecks` from `@time-fit/core/testing` against your own PostgreSQL database before relying on it. |
