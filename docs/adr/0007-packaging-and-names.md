# ADR 0007: Packaging, names, runtime targets

## Decision
- **Published packages (v1, `0.x`):** `@time-fit/core` (with subpaths `./memory` and
  `./testing`), `@time-fit/storage-prisma`, `@time-fit/integrations` (subpaths
  `./twilio`, `./mailjet`, `./desktop`; vendor SDKs as optional `peerDependencies`).
  Everything else is `private: true`.
- **Every published package** declares `exports` (no deep imports), `files`, `engines`,
  `license: MIT`, `sideEffects: false`, and a `types` entry (`.d.ts` generated from JSDoc).
- **Runtime:** Node ≥ 20 LTS, ESM only. CI matrix: 20, 22, 24.
- **Core runtime dependencies:** exactly `luxon`, `cron-parser`, `seedrandom` (plus Node
  built-ins such as `node:crypto`). Enforced in CI in Stage C1.
- **npm scope:** `@time-fit` availability/ownership is **unverified**. Claiming it is a
  **maintainer action** (npm account) and must be done before Stage G. If it is taken, the
  fallback is unscoped `timefit-core`, `timefit-storage-prisma`, `timefit-integrations`.
  Only this ADR and the package manifests change.
- **Repository:** stays in this monorepo. `apps/` holds runnable examples; `contrib/legacy`
  holds the quarantined study code (Stage D).

## Status of the maintainer action
- [ ] `@time-fit` npm org created/owned by the maintainer (or fallback chosen).
