# Contributing

Thank you for helping improve TimeFit.

## Prerequisites and setup

Use Node.js 20 or later and Yarn 4 through Corepack:

```sh
corepack enable
yarn install --immutable
yarn prisma generate --schema contrib/legacy/prisma/schema.prisma
```

The final command generates the Prisma client imported by the frozen legacy test suites.

## Required checks

Before opening a pull request, run the same checks CI runs:

```sh
yarn test
yarn workspace @time-fit/core test:coverage
yarn workspace @time-fit/storage-prisma test:coverage
yarn workspace @time-fit/integrations test:coverage
node scripts/check-core-dependencies.mjs
yarn depcruise --config .dependency-cruiser.cjs packages
./scripts/verify-packed-quickstart.sh
yarn check:licenses
```

Each publishable package requires 100% coverage. CI uses Node 20 and installs dependencies
with `yarn install --immutable`.

## Versioning

The three publishable packages are versioned independently with Changesets. Add one for every
user-visible package change with `yarn changeset`; do not add Changesets for frozen
`contrib/legacy/` work.

## Scope and design

[`contrib/legacy/`](contrib/legacy/README.md) is frozen: do not add feature work there.
Propose design changes in a new ADR under [`docs/adr/`](docs/adr/); never edit an accepted ADR.

## Pull requests and license

Use clear, imperative commit messages and keep commits and pull requests focused. Describe the
problem, the change, and relevant tests; include tests and documentation when behavior changes.
By contributing, you license your contribution under the project's
[BSD 3-Clause License](LICENSE.txt).
