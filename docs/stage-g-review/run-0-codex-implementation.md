# Stage G section 1 — Codex implementation (run 0)

Date: 2026-09-28

## Storage-prisma test setup

### Reproduction and root cause

The prior suite created `packages/storage-prisma/__test__/storage-prisma-test.db`, set
`process.env.DATABASE_URL`, regenerated `__test__/generated`, and pushed its schema in
`beforeAll`. Two concurrent `yarn workspace @time-fit/storage-prisma test:coverage` runs
reproduced the flake deterministically:

| Concurrent run | Result | Evidence |
| --- | --- | --- |
| A | 1 of 17 tests failed | The concurrent-engine test claimed/completed 100 decisions but read zero rows because the other run recreated the shared database. |
| B | 4 of 17 tests failed | SQLite returned `attempt to write a readonly database`; the conformance test also saw two claim owners, which is expected after concurrent database replacement. |

This rules in the shared SQLite file as the failure cause. The observed error is independent
of Jest's worker count: any overlapping root or package test invocation shared the same file.
The original generated-client command was also an unnecessary write during every test run;
the test did mutate the suite process's `DATABASE_URL`, though Jest workers are separate OS
processes.

### Change

- `packages/storage-prisma/scripts/ensure-test-client.mjs` checks a local generated-client
  state marker containing the test-schema SHA-256 and installed `@prisma/client` version. It
  generates only when the marker, client entry point, or native engine is absent/stale. A
  temporary-directory lock serializes first generation for concurrent commands in one checkout;
  a failed/slow lock times out explicitly instead of silently continuing.
- The root `yarn test` command and storage package `test` / `test:coverage` commands invoke the
  guard before Jest. A clean checkout therefore generates the ignored custom client before the
  test module statically imports it; ordinary runs report that the client is current.
- Each suite invocation allocates an OS-temp directory with `mkdtempSync`. It passes the file
  URL explicitly to `new PrismaClient({ datasources: { db: { url } } })` and passes the same URL
  only to the `prisma db push` child environment. The suite does not modify
  `process.env.DATABASE_URL`; a new test verifies that invariant.

### Validation

| Command | Result |
| --- | --- |
| `yarn workspace @time-fit/storage-prisma test:coverage` | 18 tests passed; 100% statements, branches, functions, and lines. First run generated the client. |
| Two concurrent `yarn workspace @time-fit/storage-prisma test:coverage` runs | Both passed all 18 tests. Both reused the current client and used separate databases. |
| `yarn test` after deleting the ignored generated client | Generated the test client before Jest; 32 suites / 458 tests passed. |

The generation guard was also invoked concurrently with its state marker removed. One command
generated the client and the other found the resulting client current; neither command failed
or wrote a second client.

### Additional release checks

| Command | Result |
| --- | --- |
| `yarn workspace @time-fit/core test:coverage` | 11 suites / 341 tests; 100% coverage. |
| `yarn workspace @time-fit/integrations test:coverage` | 1 suite / 11 tests; 100% coverage. |
| `node scripts/check-core-dependencies.mjs` | Passed for all three publishable candidates. |
| `yarn depcruise --config .dependency-cruiser.cjs packages` | Passed: 76 modules and 122 dependencies cruised. |
| `./scripts/verify-packed-quickstart.sh` | Passed core, integrations, and Prisma packed-install examples. |

## Dependabot alert audit

The GitHub Dependabot API reports alerts for the default branch (`main`), not this feature
branch. Its 342 current open alerts break down as follows:

| Manifest on `main` | Total | Critical | High | Medium | Low | `refactor-1` disposition |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `package-lock.json` | 147 | 4 | 71 | 65 | 7 | Removed; the lockfile is no longer tracked. |
| `yarn.lock` | 143 | 4 | 68 | 65 | 6 | Classified below; GitHub will recompute after merge. |
| `apps/fitbit-break/package.json` | 52 | 2 | 23 | 24 | 3 | Stale path after the app moved to `contrib/legacy/fitbit-break`. |

`yarn why --recursive --json` was run for each of the 26 affected `yarn.lock` package names
against `refactor-1`, then correlated with those 143 GitHub alert records. Production-only,
recursive registry audits for the publishable packages returned no advisories:

| Dependency-tree classification | Alert records | Critical | High | Medium | Low | Meaning |
| --- | ---: | ---: | ---: | ---: | --- |
| Publishable runtime (`core`, `storage-prisma`, `integrations`) | 0 | 0 | 0 | 0 | 0 | `yarn workspace <package> npm audit --recursive --environment production --json` was empty for each package. |
| Legacy/non-publishable workspace paths | 111 | 3 | 49 | 54 | 5 | These have a legacy path and no published-package path; a few also occur in non-published app workspaces. |
| Shared development tooling | 29 | 1 | 18 | 9 | 1 | Reached through development tools (for example Jest/Prisma tooling) in both legacy and publishable workspaces, never production dependencies of the packages. |
| No longer resolved on `refactor-1` | 3 | 0 | 1 | 2 | 0 | `lodash` has no `yarn why` path on this branch; GitHub should clear these after the default branch changes. |
| **Total `yarn.lock` records** | **143** | **4** | **68** | **65** | **6** | No published runtime advisory remains. |

### Recommendation

Merge the removal/move first so Dependabot recalculates the default branch; do not add a
path-scoped Dependabot configuration, because it cannot suppress or correctly separate
workspace-resolved `yarn.lock` advisories. Retain the user-selected quarantine: document the
remaining legacy/non-publishable risk as accepted in `contrib/legacy/README.md` after merge,
and track the 29 shared development-tooling alerts by updating tooling independently when
compatible.
Do not remove legacy workspaces or its CI job in this section; that would change the explicit
"quarantine, not delete" decision.

## Dead artifact cleanup

`package_backup.json` was a tracked, malformed historical root manifest added in commit
`03319ce`; repository-wide text search found no reference to it. It has been removed.
