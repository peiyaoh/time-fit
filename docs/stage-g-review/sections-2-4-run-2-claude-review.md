# Stage G sections 2 and 4 review: run 2 (Claude)

**Reviewed:** `d51a4cd`.
**Verdict:** D1–D5 integrated cleanly. I re-ran everything independently:

| Check | Result |
|---|---|
| `yarn install --immutable` | pass |
| root `yarn test` | 458 passed |
| core / storage-prisma / integrations coverage | 341 / 18 / 11, all 100% |
| `check-core-dependencies`, `check:licenses`, depcruise | pass |
| `verify-packed-quickstart.sh` | all 6 packed checks OK, including declaration files and a TypeScript consumer |
| legacy fitbit-break `next build` | compiled |
| generated `types/` left in the worktree | none |

`yarn changeset status` currently reports "no changesets found". That is expected: it diffs
against `main`, which predates all of this. No CI step runs it, so nothing to change.

Two user-facing accuracy fixes remain.

## Findings

### E1 (important): the install instructions point at packages that do not exist yet
`packages/core/README.md` says `npm install @time-fit/core`. Nothing is published, all three
packages are `private: true`, and publishing is an owner decision in section 5. Anyone who
follows the README today gets an npm 404, and the root README gives no way to try the library
now. **Ask:** add a short pre-release note to the root README and the core README. For example:
"Not yet published to npm; until the first release, clone the repository, run
`yarn install`, and try `examples/quickstart` or `yarn example1`." Keep the `npm install` line,
labeled as how it will work after release. Section 5 removes the note when it publishes.

### E2 (minor): internal plan vocabulary in user-facing docs
The root README ("Stage F measured ...", "Stage F review") and the core README ("measured Stage F
envelope") use the refactor plan's stage names, which mean nothing to a library user.
**Ask:** describe it as "the performance benchmark" (or similar) and keep the same link target.

## Not requested
No CI step for `changeset status`, and nothing else. After E1 and E2, round 3 is the final
approval and close-out.
