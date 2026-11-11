# Legacy study code

This directory is frozen and unmaintained. It contains the Walk-to-Joy / fitbit-break
study application and its original packages; the study is not running and has no
near-term feature work planned.

Known defects are deliberately quarantined rather than repaired: condition evaluation
references an undefined `datetime`, actions are not awaited, the default preference path
calls missing `GeneralUtility.getLocalTime`, and `fitbit-break/pages/api/cron.js` calls the
nonexistent `executeTaskForUserListForDatetime`. Legacy cron also runs in the server time
zone rather than each participant's zone (ADR 0006).

The root `yarn test` command pins `TZ=America/New_York` because characterization tests
encode that server-time-zone behavior. New work belongs in `packages/core`; generic legacy
conditions are superseded by core's `time-window` condition. See
[`docs/jitai-library-plan.md`](../../docs/jitai-library-plan.md).

## Known dependency advisories

As of 2026-09-28, the Stage G dependency audit classified GitHub's `yarn.lock` alerts on `main`
as: 0 publishable-runtime, 111 legacy/non-publishable, 29 shared development-tooling, and 3 for
packages no longer resolved on `refactor-1`. On this branch, lockfile-only refreshes then moved
8 of the 9 shared-tooling families to patched versions (see `docs/stage-g-review/`). The
exception is `tar` 6.2.1, pinned by this app's `bcrypt@5` → `@mapbox/node-pre-gyp@1` chain.
This frozen legacy code is quarantined, so its advisories are accepted rather than repaired.
Publishable runtime dependencies are audited separately and report none. GitHub's Dependabot
counts will change once `main` includes this branch and its lockfile is recomputed.
