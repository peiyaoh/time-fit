# Stage G section 3: project policy files — implementation (run 0)

## Added

- `CONTRIBUTING.md` with Node/Corepack setup, every CI check, legacy and ADR rules, pull
  request expectations, and the BSD 3-Clause contribution license.
- `CODE_OF_CONDUCT.md` with Contributor Covenant 2.1 and the configured GitHub-only reporting
  route; `SECURITY.md` with supported-version, scope, report-content, and best-effort-response
  guidance; and `GOVERNANCE.md` with the single-maintainer model.
- Short bug, feature, security-routing, and pull-request templates under `.github/`, plus a
  README navigation section.

## Owner action required

Enable **Settings → Security → Private vulnerability reporting** for
`peiyaoh/time-fit`. The policy and issue-template links intentionally use GitHub's private
reporting form and publish no email address; that form will not accept reports until the
repository setting is enabled.

## Verification

All required checks passed after these documentation-only changes:

- `yarn test` (32 suites, 458 tests)
- the three package `test:coverage` commands (100% each)
- `node scripts/check-core-dependencies.mjs`
- `yarn depcruise --config .dependency-cruiser.cjs packages`
- `./scripts/verify-packed-quickstart.sh`
