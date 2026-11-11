## Summary

Describe the problem and change.

## Checks

- [ ] `yarn test`
- [ ] `yarn workspace @time-fit/core test:coverage`
- [ ] `yarn workspace @time-fit/storage-prisma test:coverage`
- [ ] `yarn workspace @time-fit/integrations test:coverage`
- [ ] `node scripts/check-core-dependencies.mjs`
- [ ] `yarn depcruise --config .dependency-cruiser.cjs packages`
- [ ] `./scripts/verify-packed-quickstart.sh`
