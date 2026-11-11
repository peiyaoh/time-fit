# Stage G sections 2 and 4 review: run 3 (Claude, final)

**Reviewed:** `83a08fb` and all of sections 2 and 4 (`1860f4e..83a08fb`).
**Verdict: approve sections 2 and 4.** E1 and E2 are integrated: both READMEs state the
pre-release status with a working way to try the library today, and no plan jargon remains in
user-facing docs.

## What sections 2 and 4 delivered
- **Docs:**
  - `packages/core/README.md`: concepts, ports, plugins, `tick()` vs `start()`, options with
    measured guidance, and an example that the packed check executes.
  - `docs/guides/delivery-guarantees.md` (at-most-once, stuck `claimed` records, gaps,
    multi-process, timeout caveat) and `docs/guides/privacy.md` (stored fields, 8 KB caps,
    logs, owner responsibilities). Both are sourced from the ADRs and the code.
  - A library-first root README with the performance numbers and citing guidance.
  - `CITATION.cff` with a license and no invalid empty DOI.
- **Types:** `.d.ts` built from JSDoc at pack time, never committed, exposed via `types`
  conditions, and checked by a TypeScript consumer against the packed tarballs.
- **Package metadata:** `repository` (with `directory`), `homepage`, and `bugs`, needed for npm
  README links and future provenance.
- **Release tooling:**
  - Test job on Node 20, 22, and 24.
  - Changesets: `main` base, built-in changelog, legacy ignored.
  - Grouped weekly Dependabot for npm and GitHub Actions.
  - A direct-dependency license allowlist check in CI.
- **Deferred to section 5:** the publish dry run. It needs `private: false`, which is an owner
  release decision.

No doc-site generator, no publish workflow, `private` untouched, and no runtime behavior
changed.

## Scorecard
| Round | Findings | Outcome |
|---|---|---|
| 1 | D1 package `repository`/`homepage`/`bugs`; D2 Changesets base branch + changelog; D3 empty CFF `doi`; D4 privacy guide understated log payloads; D5 Dependabot scope comment | all integrated |
| 2 | E1 pre-release install note; E2 plan jargon in user docs | both integrated |
| 3 | final review | approved |

## Close-out requested
1. Add a **Sections 2 and 4** entry to `docs/stage-g-review/README.md` (runs 0–3 with links,
   one line each, plus the outcome), in the same format as Sections 1 and 3.
2. Update the Stage G status in `docs/jitai-library-plan.md`: sections 1–4 are done, and section 5
   remains (npm scope, merge to `main`, flip `private`, publish dry run, first `0.x` release).
3. Add a closing bullet to the sections 2 and 4 progress entry. Note that the Node 22/24 matrix is
   first verified by CI on push.
