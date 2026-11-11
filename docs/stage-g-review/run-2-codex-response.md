# Stage G section 1 review: run 2 response

> **Implemented by Claude, not Codex.** The round-2 task was dispatched on 2026-09-28, but
> Codex had 3% of its 5-hour usage limit left (reset at 18:03). It had dropped to a smaller
> model and never picked the task up, so the dispatch was abandoned. With the user's go-ahead
> ("continue"), Claude implemented G4, the mechanical lockfile refresh requested in its own
> review. Round 3 is therefore a self-review; an independent Codex pass after the reset is
> recommended.

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| G4: lockfile-only refresh of the other eight shared-tooling families | Integrated (7 fully, `tar` partially) | `yarn up -R <family> --mode=update-lockfile` for each family. No `package.json` range changed. Every resolved version is now at or above the advisory's first patched version, except `tar` 6.2.1, which is pinned by the legacy chain `fitbit-break → bcrypt@5.1.1 → @mapbox/node-pre-gyp@1.0.11 → tar@^6`. Moving it needs a major `bcrypt` upgrade inside frozen legacy code, which is out of scope and accepted under the legacy policy. | `yarn.lock`, `contrib/legacy/README.md` |

## Versions (lockfile, before → after)

| Family | Before | After | First patched (from the alerts) | Status |
|---|---|---|---|---|
| ajv | 6.12.6, 8.20.0 | 6.15.0, 8.20.0 | 6.14.0 | fixed |
| brace-expansion | 1.1.11, 5.0.5 | 1.1.21, 5.0.12 | 1.1.16 | fixed |
| browserslist | 4.24.4 | 4.29.2 | 4.28.7 | fixed |
| ip-address | 10.1.0 | 10.7.2 | 10.3.1 | fixed |
| js-yaml | 3.14.1, 4.1.0 | 3.15.2, 4.3.2 | 3.15.2 / 4.3.2 | fixed |
| minimatch | 3.1.2, 10.2.5 | 3.1.5, 10.2.6 | 3.1.3 | fixed |
| picomatch | 2.3.1, 4.0.4, 4.0.7 | 2.3.2, 4.0.7 | 2.3.2 | fixed |
| tar | 6.2.1, 7.5.13 | 6.2.1, 7.5.22 | 7.5.21 | 7.x fixed; 6.2.1 legacy-only, accepted |

Together with round 1's `@babel/core` 7.29.7, 8 of the 9 shared-tooling families now resolve
at or above their patched versions on this branch.

## Validation (2026-09-28)

| Check | Result |
|---|---|
| `yarn install --immutable` | pass |
| root `yarn test` | 32 suites / 458 passed |
| `@time-fit/core` / `storage-prisma` / `integrations` coverage | 341 / 18 / 11 tests, all 100% |
| `node scripts/check-core-dependencies.mjs`, `yarn depcruise ... packages` | pass |
| `./scripts/verify-packed-quickstart.sh` | 4/4 packed checks pass |
| `contrib/legacy/fitbit-break` `next build` | compiled successfully |
| `yarn workspace <pkg> npm audit --recursive --environment production` (all 3) | "No audit suggestions" |
