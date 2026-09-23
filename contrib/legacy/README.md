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
