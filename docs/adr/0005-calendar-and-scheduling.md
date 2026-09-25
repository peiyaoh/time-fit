# ADR 0005: Calendar and scheduling

## Context
Legacy checks "is now a checkpoint?" once per observed minute
(`TimeEngine.js:152-175`, `TaskExecutor.js:400-535`). It has these defects:
- cron is parsed without a time zone, so it is evaluated in the **server's** zone, not the
  participant's (`DateTimeHelper.matchCronExpreesionAndDate`);
- skipped minutes are lost;
- DST behavior is accidental.

## Decision

### 1. Time zones
A valid zone is a string matching `^[A-Za-z][A-Za-z0-9_+\-/]*$` **and** accepted by
Luxon's `IANAZone.isValidZone`. The regex exists because Luxon also accepts fixed-offset
strings such as `"+05:00"`, which are not IANA names and never observe DST. Examples:
- valid: `America/Detroit`, `UTC`, `Etc/GMT+5`, `EST5EDT`;
- invalid: `+05:00`, `Mars/Olympus`, `""`.

### 2. Checkpoints (all at minute precision)
| Kind | Shape | Local rule |
|---|---|---|
| cron | `{ id, cron: "m h dom mon dow", offsetMinutes? }` | 5-field only (seconds field rejected), evaluated in the zone (`cron-parser` `tz`) |
| time | `{ id, time: "HH:mm", daysOfWeek?: (1..7)[], offsetMinutes? }` | 24-hour; ISO weekday (1 = Monday); default every day |
| preference | `{ id, preference: string, daysOfWeek?, offsetMinutes? }` | `preferenceResolver` returns `"HH:mm"` for the local date |

- **Zone:** the participant's zone for participant scope, `task.timeZone` for system scope.
- **`offsetMinutes`:** integer in [−1440, 1440]. It is added to the computed **instant** as an
  absolute duration, not in wall-clock time. So 30 minutes after the first 01:30 on
  fall-back day is 01:00 EST (fixture `fold-offset-is-absolute`).
- **DST gap** (the local time does not exist): shift forward by the gap length (02:30 →
  03:30).
- **DST fold** (the local time occurs twice): first occurrence only. This applies to cron
  too: `*/30 1 * * *` fires 01:00 and 01:30 EDT, not again in EST.

  Both rules match `cron-parser` 5.0.6 + Luxon 3.6.0 defaults (verified 2026-09-22). The
  fixtures pin them, so a library upgrade that changes the behavior fails CI instead of
  silently shifting interventions.

### 3. Enumeration window
Each `tick(now)` enumerates occurrences with `scheduledAt ∈ (from, to]`, where
```
to   = now
from = max(lastTick ?? −∞, now − catchUpWindow)
```
- Open start / closed end: an occurrence exactly at `now` belongs to this tick and is never
  enumerated twice by consecutive ticks.
- `options.catchUpWindowMinutes`: integer 1–1440, default 5.
- `lastTick` is **in memory only** (no durable watermark). After a restart the window
  re-covers up to `catchUpWindow`, and the idempotent `claim` (ADR 0004) prevents
  re-delivery.
- **Missed window:** if `lastTick` is defined and `now − lastTick > catchUpWindow`, the
  interval `(lastTick, now − catchUpWindow]` is not evaluated. The engine emits
  `scheduler-missed-window {from, to}` (warn) and calls `decisionLog.recordGap?`.
- `latenessMs = evaluatedAt − scheduledAt` is recorded; plugins receive `scheduledAt`.
- For time/preference checkpoints, the engine evaluates each local date touched by
  `[from, to]` in the zone (at most 2 dates when the window ≤ 24 h).

### 4. Ticking
- `tick(now)` is the **primary** entry point (external cron, serverless, tests). It is
  awaitable and deterministic given `clock`, `random`, and port responses.
- `start()` is a convenience that calls `tick(clock.now())` at each minute boundary.
  `stop()` resolves after any in-flight tick finishes.
- **No overlap in-process:** a `tick` called while another is running resolves
  immediately with `{ skipped: "in-flight" }` and logs it. Across processes, the unique
  claim is the guard.
- Per participant, tasks run sequentially in ascending `priority` (ties: `id`). Across
  participants, concurrency is `options.concurrency` (1–64, default 1 in v1; values > 1
  are tested in Stage F).
- Each tick returns and logs a summary: counts of occurrences, ineligible, unavailable,
  claimed, skipped-claimed, completed, failed, `preferenceUnresolved`,
  `participant-invalid*`, and the duration.

## Consequences
- The legacy defect (cron evaluated in the server zone) is fixed by construction.
- Occurrence computation is a pure function `occurrences(checkpoint, zone, window, resolvedTime?)`.
  Stage F may memoize it per zone.
