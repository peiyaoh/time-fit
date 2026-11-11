# Stage G section 1 review: run 3 (Claude, final)

**Reviewed:** `6844753` and the whole of section 1 (`bb47fe4..6844753`).
**Verdict: approve section 1.**

> Independence caveat: round 2 was implemented by Claude (Codex was at its usage limit), so
> this final round reviews Claude's own lockfile change. An independent Codex pass after its
> limit resets is recommended before release.

## What section 1 delivered
- **Flake fixed at its cause.** Codex reproduced it deterministically: two concurrent runs
  shared one SQLite file, producing readonly-write errors and zero-row reads. Each run now gets
  its own `mkdtemp` database. The URL is passed explicitly to `PrismaClient` and to the
  `db push` child only, and `process.env.DATABASE_URL` is never mutated (a test guards this).
- **Kept simple.** A 119-line lock/cache guard was proposed and then removed in round 1
  (it saved ~0.6 s per run and addressed no observed failure). The client is generated with
  plain `prisma generate` before Jest, so a clean checkout works. Six concurrent coverage runs
  passed.
- **Dependabot, with numbers.** Of the alerts on `main`: 147 come from a stale
  `package-lock.json` already gone on this branch, and 52 point at the old
  `apps/fitbit-break` path. Of the 143 `yarn.lock` alerts: 0 are in publishable runtime trees,
  111 are legacy, 29 are shared dev tooling, and 3 are no longer resolved. Lockfile-only
  refreshes moved 9 of the 10 affected dev-tooling families (including `@babel/core`) to
  patched versions. `tar` 6.2.1 remains, pinned only by legacy `bcrypt@5`, and is accepted and
  documented in `contrib/legacy/README.md`.
- **Dead artifact removed:** `package_backup.json`.
- Net code change, excluding the lockfile and docs: +36 / −63 lines.

## Final nit (no action)
`mkdtempSync` runs when the test module loads rather than in `beforeAll`, so a suite that fails
to import leaves an empty temp directory behind. That is harmless; not worth a change.

## Scorecard
| Round | Findings | Outcome |
|---|---|---|
| 1 | G1 over-engineered client guard; G2 defer-to-merge docs; G3 dev-tooling alerts | G1, G2 integrated; G3 partially (`@babel/core`) |
| 2 | G4 same lockfile refresh for the remaining 8 families | integrated by Claude (Codex at limit); 7 fixed, `tar` 6.x legacy-only |
| 3 | final review | approved |
