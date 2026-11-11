# Stage G sections 2 and 4: implementation (run 0)

## Delivered

1. Added `packages/core/README.md`: installable quickstart, task/decision concepts, ports,
   plugin contract, scheduling, options, performance guidance, and ADR links.
2. Added `docs/guides/delivery-guarantees.md` from ADRs 0002–0005: unique claim,
   at-most-once/no retry, stuck claims, gaps, concurrent ticks/processes, and timeout caveat.
3. Added `docs/guides/privacy.md` from ADRs 0004/0009: decision fields, 8 KB plugin/snapshot
   payload cap, participant-object exclusion, IDs in logs, `logUnavailable: false`, bounded
   memory-store warning, and application responsibilities. It is not legal advice.
4. Added TypeScript declaration generation from existing JSDoc for core, storage-prisma, and
   integrations. Package exports now carry `types` conditions; `npm pack` includes generated
   declarations and removes local generated output afterward. Packed verification checks all
   public TypeScript imports.
5. Rewrote root README around library packages, links, examples, measured Stage F envelope,
   citation/MRT decision-log guidance, and contribution links.
6. Updated `CITATION.cff` to BSD-3-Clause while retaining canonical URL and omitting unreleased
   version/date fields.
7. Expanded only CI Test job to Node 20, 22, and 24; other jobs stay on Node 20.
8. Added Changesets CLI, root scripts, independent-package config, and contribution guidance;
   private root/app/legacy workspaces are ignored.
9. Added weekly grouped Dependabot updates for root npm and GitHub Actions, with frozen-legacy
   scope noted in configuration.
10. Added small direct runtime/peer dependency SPDX allowlist check for publishable packages and
    wired it into CI.
11. Deferred publish dry run to Stage G section 5. Candidates remain `private: true`, and no
    ownership or release decision was assumed; packed-tarball verification checks contents now.

## Verification

The core README example is the executable `examples/quickstart/index.mjs`; packed verification
ran it successfully. `yarn build:types` generated all declaration trees, and the packed fixture
compiled a temporary NodeNext TypeScript consumer importing every public entry point.

All required checks passed: `yarn install --immutable`; root `yarn test` (32 suites, 458
tests); core coverage (11 suites, 341 tests, 100%); storage-prisma coverage (1 suite, 18 tests,
100%); integrations coverage (1 suite, 11 tests, 100%); dependency and license checks;
dependency-cruiser (82 modules, 127 dependencies); packed quickstart; and legacy fitbit-break
build. The legacy build emitted pre-existing lint warnings but exited successfully.
