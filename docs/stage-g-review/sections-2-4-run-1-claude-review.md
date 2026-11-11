# Stage G sections 2 and 4 review: run 1 (Claude)

**Reviewed:** `87c66a4`.
**Verdict:** strong and appropriately small.
- The core README is accurate against the code. Its example is the quickstart that the packed
  check executes.
- The delivery-guarantees guide matches ADRs 0002–0005, including the timeout caveat.
- Type declarations are built at pack time, never committed, and exposed through `types`
  conditions. A TypeScript consumer compiles against the packed tarballs.
- The license check is small and states its direct-dependency scope.
- The publish dry run is deferred correctly, and `private` is untouched. No doc-site generator
  and no publish workflow were added.

Five findings, all small.

## Findings

### D1 (important): the publishable packages have no `repository` / `homepage` / `bugs`
`packages/{core,storage-prisma,integrations}/package.json` have none of these fields. Two
consequences:
- `packages/core/README.md` ships in the tarball, and its relative links (`../../docs/adr/...`,
  `../../docs/guides/...`) are broken on npmjs.com. npm resolves relative README links only
  from `repository`, with a `directory` for monorepos.
- `npm publish --provenance`, planned for section 5, requires `repository` to match the
  GitHub repo.

**Ask:** add to each of the three packages:
`"repository": { "type": "git", "url": "git+https://github.com/peiyaoh/time-fit.git", "directory": "packages/<name>" }`,
`"homepage": "https://github.com/peiyaoh/time-fit/tree/main/packages/<name>#readme"`, and
`"bugs": "https://github.com/peiyaoh/time-fit/issues"`.

### D2: Changesets points at the feature branch and turns off changelogs
`.changeset/config.json` has `"baseBranch": "refactor-1"`. Release PRs and `changeset status`
compare against the default branch, which is `main` once this branch merges. It also has
`"changelog": false`, but the plan's release item includes a CHANGELOG. **Ask:** set
`"baseBranch": "main"` and use the built-in `"changelog": "@changesets/cli/changelog"`, which
needs no new dependency.

### D3: `CITATION.cff` has an empty `doi:` key
The key is left with no value, which parses as `null`. The CFF 1.2.0 schema types `doi` as a
DOI string, so validators and GitHub's "Cite this repository" can reject or mis-render it.
**Ask:** remove the key. It was pre-existing, but this section owns `CITATION.cff`.

### D4 (accuracy): the privacy guide understates what logs contain
It says logs carry correlation IDs. They also carry payloads:
- `decision-condition-error` logs the evaluated condition records, including (capped)
  evidence (`packages/core/src/engine/decision.js`).
- `decision-action-failed` logs the action error.

**Ask:** one sentence saying that warning and error events can include condition evidence and
error messages, so plugins should keep evidence free of personal data.

### D5 (minor accuracy): the Dependabot comment overstates its scope
It says updates are "intentionally limited to active root tooling". But the root `npm` entry
covers the whole Yarn workspace lockfile, including `contrib/legacy` workspaces. **Ask:**
reword it to say what it does, for example "one grouped root entry; legacy workspace bumps may
appear and follow the frozen-legacy policy (accept or close)". Do not add path exclusions
unless you can show Dependabot honors them for Yarn workspaces.

## Not requested
The Node 22/24 matrix cannot be verified locally; the first CI run on push will show it. If a
legacy suite fails there, it is handled then under the quarantine policy.
