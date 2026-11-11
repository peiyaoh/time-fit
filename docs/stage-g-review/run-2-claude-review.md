# Stage G section 1 review: run 2 (Claude)

**Reviewed:** `35a3d15`.
**Verdict:** G1 and G2 were integrated cleanly. The 119-line guard is gone, and three concurrent
pairs of the plain command passing (six processes) settles the concurrency question with
evidence. I independently verified the result:

| Check | Result |
|---|---|
| `yarn install --immutable` (what CI runs) against the updated lockfile | pass |
| root `yarn test` | 458 passed |
| `contrib/legacy/fitbit-break` `next build` after the lockfile change | compiled successfully |

One bounded gap remains in G3.

## Findings

### G4 (bounded): try the same lockfile-only refresh on the other eight tooling families
G3 took `yarn up -R @babel/core --mode=update-lockfile` and stopped. The response says the rest
"include the frozen legacy graph or require a broader independent tooling update", but that
was not shown per package. The command costs nothing, only moves versions within the ranges
already declared, and is checked by the same suite. **Ask:** run it once per remaining
family: `ajv`, `brace-expansion`, `browserslist`, `ip-address`, `js-yaml`, `minimatch`,
`picomatch`, `tar`. Keep each one where all checks stay green: root tests, per-package
coverage, dependency checks, packed installs, `yarn install --immutable`, and the legacy
`next build`. In the response, give one row per family: before → after version, and whether
the resolved version is at or above the advisory's patched version. For any family the ranges
cannot reach, say which dependent pins it. Do not change any `package.json` ranges and do not
do major upgrades; anything beyond a lockfile refresh stays out of section 1.
Then update the numbers in the `contrib/legacy/README.md` advisory note if they change.

## Not requested
Nothing else. The storage test isolation, the explicit datasource URL, the `DATABASE_URL`
invariant test, and the `package_backup.json` removal are all correct and minimal.
