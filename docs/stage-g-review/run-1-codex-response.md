# Stage G section 1 review: run 1 response (Codex)

Date: 2026-09-28

| Finding | Decision | Evidence or reason | Files |
| --- | --- | --- | --- |
| G1: replace the generated-client guard with Prisma's direct command | Integrated | The cross-process client cache, state file, polling lock, and timeout were unrelated to the reproduced SQLite-file race. The existing root and package pre-Jest hooks now run Prisma directly. Three independent concurrent pairs of `@time-fit/storage-prisma` coverage commands (six processes total) each generated the client directly and passed all 18 tests at 100% coverage, so a guard has no demonstrated failure to prevent. | `packages/storage-prisma/package.json`; deleted `packages/storage-prisma/scripts/ensure-test-client.mjs` |
| G2: record accepted legacy advisories now | Integrated | The legacy README now records the 2026-09-28 classification: 0 publishable-runtime, 111 legacy/non-publishable, 29 shared development-tooling, and 3 no-longer-resolved alerts. It explicitly preserves the frozen-quarantine policy and explains that Dependabot recomputes its counts after `main` receives this branch. | `contrib/legacy/README.md` |
| G3: identify shared dev-tooling alerts and take a safe lockfile-only fix | Partially integrated | The shared tooling alert records name `@babel/core`, `ajv`, `brace-expansion`, `browserslist`, `ip-address`, `js-yaml`, `minimatch`, `picomatch`, and `tar`; alert records outnumber unique package names because versions and advisories recur. `yarn up -R @babel/core --mode=update-lockfile` changed only `yarn.lock`, resolving the Jest-transitive package from 7.26.10 to 7.29.7, above Dependabot's 7.29.6 patched version for GHSA-4x5r-pxfx-6jf8. The remaining alert families include the frozen legacy graph or require a broader independent tooling update, so they are listed rather than bundled into this review fix. | `yarn.lock` |

## Validation

| Command | Result |
| --- | --- |
| Three concurrent pairs of `yarn workspace @time-fit/storage-prisma test:coverage` | All 6 commands passed; each: 1 suite / 18 tests and 100% statements, branches, functions, and lines. |
| `yarn test` | 32 suites / 458 tests passed after relinking the updated lockfile. |
| `yarn workspace @time-fit/core test:coverage` | 11 suites / 341 tests; 100% statements, branches, functions, and lines. |
| `yarn workspace @time-fit/storage-prisma test:coverage` | 1 suite / 18 tests; 100% statements, branches, functions, and lines. |
| `yarn workspace @time-fit/integrations test:coverage` | 1 suite / 11 tests; 100% statements, branches, functions, and lines. |
| `node scripts/check-core-dependencies.mjs` | Passed for all three publishable candidates. |
| `yarn depcruise --config .dependency-cruiser.cjs packages` | Passed: 75 modules and 122 dependencies cruised. |
| `./scripts/verify-packed-quickstart.sh` | Passed core, subpath, integrations, and Prisma packed-install examples. |
| Benchmark | Not run: no benchmark-relevant core behavior changed. |
