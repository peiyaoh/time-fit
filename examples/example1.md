# Example 1: Nudge yourself to take a break every 30 minutes on weekdays

This example sends you a desktop notification every 30 minutes on weekdays (in your time
zone) reminding you to take a break from your screen. It needs no database: tasks and
decision records live in memory.

The complete code is [`apps/take-a-break/index.js`](../apps/take-a-break/index.js). Run it
from the project folder with:

```bash
yarn example1
```

## Step by step

### Step 1: Import the engine, a store, and a delivery action

`@time-fit/core` provides the engine, `@time-fit/core/memory` an in-memory store, and
`@time-fit/integrations/desktop` a desktop-notification action. The action takes a notifier
you supply ([`node-notifier`](https://github.com/mikaelbr/node-notifier) here), so the
library itself has no dependency on it.

```javascript
import notifier from "node-notifier";
import { createTimeEngine } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { desktopNotificationAction } from "@time-fit/integrations/desktop";
```

### Step 2: Describe the task

A task says **when** to decide (checkpoints) and **what** to do (outcomes). This one is a
`"system"` task: it runs once per checkpoint, not once per participant, so it must name the
time zone its schedule is evaluated in. The cron expression `*/30 * * * 1-5` means "every 30
minutes, Monday to Friday", evaluated in `America/Detroit`.

```javascript
const TASK = {
  id: "take-a-break",
  scope: "system",
  timeZone: "America/Detroit",
  checkpoints: [{ id: "weekday-half-hour", cron: "*/30 * * * 1-5" }],
  outcomes: [
    {
      id: "notify",
      probability: 1,
      action: { type: "desktop-notification", message: "It's 30 minutes already. Take a break from your screen!" },
    },
  ],
};
```

`outcomes` can hold several options with probabilities that sum to 1. The engine picks one
per decision with a reproducible random draw, which is how micro-randomized trials are built.
Here there is only one outcome, so it always notifies.

### Step 3: Create the engine

Give the engine a store and the actions your tasks use. The configuration is validated
immediately; a mistake throws an `EngineConfigError` that lists every problem.

```javascript
const storage = createMemoryStore({ tasks: [TASK] });
const engine = createTimeEngine({
  storage,
  actions: [desktopNotificationAction({ notifier, title: "TimeFit" })],
});
```

### Step 4: Run it

`engine.start()` evaluates the schedule at every minute boundary. If you drive scheduling
yourself (for example from an external cron job or a serverless function), call
`await engine.tick(new Date())` instead. It returns a summary of what happened.

```javascript
engine.start();
```

## Where to go next

- [`examples/quickstart`](quickstart/index.mjs): a participant-scoped task with a randomized
  "remind" vs. "control" outcome, in about 20 lines.
- [`examples/prisma`](prisma/): the same engine backed by a database via
  `@time-fit/storage-prisma`.
- [`docs/adr/`](../docs/adr/): the design decisions behind tasks, scheduling, and decision
  records.
