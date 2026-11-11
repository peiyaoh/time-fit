# Stage G section 1 review: run 1 (Claude)

**Reviewed:** `0cb08f4`.
**Verdict:** the diagnosis is excellent. Running two suites at once reproduced the flake
deterministically, and the cause is the shared SQLite file (readonly-write errors, reads that
find zero rows), not client generation. The per-run temporary database with an explicit
datasource URL is the right fix and is small (about 20 lines in the test). The Dependabot
classification is thorough and matches my own measurement (147 / 143 / 52). One part is
over-engineered, and one recommendation is deferred without a reason.

## Findings

### G1 (main): the client-generation guard costs far more than it saves
`scripts/ensure-test-client.mjs` is **119 lines**: a `mkdir` lock in the OS temp directory with
a 60-second timeout and polling, a state file keyed by schema SHA-256 and `@prisma/client`
version, an atomic rename, and a staleness check on the engine binary. Measured on this
machine:

| Operation | Time |
|---|---:|
| plain `prisma generate --schema __test__/schema.prisma` | 0.69–0.92 s |
| guard when the client is current | 0.09 s |

So the guard saves **~0.6 s per test run**. The flake it sits next to was caused by the shared
database, which the test change already fixed, not by generation. The lock only matters when
two test commands start at the same moment in one checkout. That never happens in CI, and a
developer doing it locally can rerun.

**Ask:** replace the script with the plain command
(`"prisma:generate:test": "prisma generate --schema __test__/schema.prisma"`), keep it as the
pre-Jest step in `test`, `test:coverage`, and the root `test`, and delete
`ensure-test-client.mjs`. This keeps the one property that matters: it works from a clean
checkout.
**Push back only with evidence:** if two concurrent *plain* generations followed by the suites
actually fail (reproduce it several times), keep a guard, but make it the smallest one that
fixes the observed failure.

### G2: document the accepted legacy alerts now, not "after merge"
The report recommends recording the legacy/non-publishable alerts as accepted in
`contrib/legacy/README.md` after the merge. Nothing about that depends on the merge; the
classification was computed against this branch. **Ask:** add a short "Known dependency
advisories" section there now. Include the date, the breakdown (0 publishable runtime / 111
legacy / 29 shared dev tooling / 3 no longer resolved), the policy (legacy is frozen, and its
advisories are accepted rather than fixed), and a note that GitHub's counts will change once
`main` picks up this branch.

### G3 (optional, bounded): the 29 shared dev-tooling alerts
List the affected package names in the response. If some are fixed by a **patch or minor**
update of a dev dependency, one that changes only the lockfile and keeps every check green,
take it. Otherwise just list them. Do not do major-version upgrades of Jest or Prisma in this
section.

## Not requested
No Dependabot configuration, and no removal of legacy workspaces or the fitbit-break CI job.
Both agree with your recommendation.
