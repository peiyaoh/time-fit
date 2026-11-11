# Stage G sections 2 and 4: response to review run 2

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| E1: unpublished install path | Integrated | Root and core package README now say packages are not yet on npm, give the repository quickstart path, and label `npm install` as post-release. This matches intentional `private: true` status and section 5 ownership decision. | `README.md`, `packages/core/README.md` |
| E2: internal stage vocabulary | Integrated | User-facing prose now calls the linked result a performance benchmark/report; historical file path stays unchanged. | `README.md`, `packages/core/README.md` |

## Verification

No benchmark-relevant runtime code changed. All required checks passed: `yarn install --immutable`;
root `yarn test` (32 suites, 458 tests); core coverage (11 suites, 341 tests, 100%);
storage-prisma coverage (1 suite, 18 tests, 100%); integrations coverage (1 suite, 11 tests,
100%); `node scripts/check-core-dependencies.mjs`; dependency-cruiser (82 modules, 127
dependencies); and packed quickstart, including packed TypeScript public-import compilation.
