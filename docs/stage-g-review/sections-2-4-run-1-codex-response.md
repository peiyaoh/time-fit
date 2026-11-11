# Stage G sections 2 and 4: response to review run 1

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| D1: package repository metadata | Integrated | Package `repository.directory` lets npm resolve tarball README links to the monorepo source and is required groundwork for section 5 provenance publishing. | `packages/{core,storage-prisma,integrations}/package.json` |
| D2: Changesets base/changelog | Integrated | `baseBranch: main` matches the repository default release target; built-in Changesets changelog needs no extra package. `yarn changeset status` now loads config and only reports the expected absence of a release changeset for current unpublished candidates. | `.changeset/config.json` |
| D3: empty CFF DOI | Integrated | Removed null-valued `doi`; CFF now contains only supported, known citation metadata. | `CITATION.cff` |
| D4: log payload privacy | Integrated | Guide now states warning/error events can carry capped condition evidence and error messages, matching `decision-condition-error` and `decision-action-failed`. | `docs/guides/privacy.md` |
| D5: Dependabot scope | Integrated | Comment now accurately says a root Yarn workspace entry can surface legacy bumps and directs handling through frozen-legacy policy. | `.github/dependabot.yml` |

## Verification

No benchmark-relevant runtime code changed. All required checks passed: `yarn install --immutable`;
root `yarn test` (32 suites, 458 tests); core coverage (11 suites, 341 tests, 100%);
storage-prisma coverage (1 suite, 18 tests, 100%); integrations coverage (1 suite, 11 tests,
100%); `node scripts/check-core-dependencies.mjs`; dependency-cruiser (82 modules, 127
dependencies); and packed quickstart, including packed TypeScript public-import compilation.
