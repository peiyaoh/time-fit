# Example 2: Nudge users to take a break every 30 minutes if step count is too low

This example shows how to create a nudging intervention that emails users who have not reached a step count threshold (e.g., 100 steps) in the last 30 minutes, every 30 minutes on weekdays. A Fitbit wristband is used to measure step count.

**Quick Steps Overview:**
1. Import TimeEngine
2. Register an email action
3. Register a Fitbit step count condition
4. Configure parameters for the condition and action
5. Register a periodic task
6. Start the engine

---

## Prerequisites

- A server with a domain name (e.g., https://fitbitbreak.io)
- A Fitbit developer account (free)
- A Mailjet account (free) for sending emails

You will need:
- A server for user Fitbit authorization
- An engine to execute decision rules and send interventions

*Note: This tutorial focuses on the decision rule logic, not the web application.*

---

## Step-by-Step Guide

### Create the app

Create a folder called `my-app2` under `/apps` and create an `index.js` file inside the `/apps/my-app2` folder.

### Step 1: Import TimeEngine

The `TimeEngine` manages all tasks in TimeFit.

```javascript
import TimeEngine from "@time-fit/time-engine/TimeEngine.js";
```

### Step 2: Register an email action

Each task can perform actions such as sending emails. Use the provided `CustomEmailAction`:

```javascript
import CustomEmailAction from "@time-fit/action-collection/CustomEmailAction";
const newAction = new CustomEmailAction();
TimeEngine.registerAction("take-a-break-message", newAction);
```

### Step 3: Register a Fitbit step count condition

Register a condition to check if a user's step count exceeds a threshold in a given period:

```javascript
import HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition from "@time-fit/data-source/fitbit/condition/HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition";
const fitbitCondition = new HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition();
TimeEngine.registerCondition("fitbit-over-threshold", fitbitCondition);
```

### Step 4: Configure condition and action parameters

#### Fitbit Condition Parameters

Set the step count threshold and the period to check (last 30 minutes):

```javascript
const fitbitConditionParameters = {
  criteria: {
    threshold: 100,
    period: TimeEngine.generateCriteriaPeriod(
      "now", "minus", { minutes: 30 },
      "now", "plus", { hours: 0 }
    )
  }
};
```

**`generateCriteriaPeriod` parameters:**

| Parameter                | Description                          | Example         |
|--------------------------|--------------------------------------|-----------------|
| Period start reference   | Start point ("now", "midnight", etc) | "now"           |
| Period start offset type | "plus" or "minus"                    | "minus"         |
| Period start offset      | Offset object                        | { minutes: 30 } |
| Period end reference     | End point                            | "now"           |
| Period end offset type   | "plus" or "minus"                    | "plus"          |
| Period end offset        | Offset object                        | { hours: 0 }    |

#### Email Action Parameters

Set the email message content:

```javascript
const emailActionParameters = {
  message: "It's been 30 minutes. Take a break from your screen!",
};
```

---

### Step 5: Register a periodic task

Register a user task that runs every 30 minutes on weekdays, checking the condition and sending the action if needed.

```javascript
const conditionParametersList = [
  {
    name: "fitbit-over-threshold",
    parameters: fitbitConditionParameters,
  },
];
const actionParametersList = [
  {
    name: "take-a-break-message",
    parameters: emailActionParameters,
  },
];

TimeEngine.registerOneUserTaskWithCronConditionListActionList(
  "take-a-break",
  "*/30 * * * 1-5",
  conditionParametersList,
  actionParametersList
);
```

---

### Step 6: Start the engine

Start the TimeEngine to begin the intervention.

```javascript
TimeEngine.start();
```

In the terminal, run:
```
node index.js
```

---

## Troubleshooting

- Double-check your API keys and credentials for Fitbit and Mailjet.
- Ensure your server is accessible and users have authorized Fitbit access.
- Check logs for errors if emails are not sent.

---

## Complete Example

```javascript
import TimeEngine from "@time-fit/time-engine/TimeEngine.js";
import CustomEmailAction from "@time-fit/action-collection/CustomEmailAction";
import HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition from "@time-fit/data-source/fitbit/condition/HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition";

// Register action
const newAction = new CustomEmailAction();
TimeEngine.registerAction("take-a-break-message", newAction);

// Register condition
const fitbitCondition = new HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition();
TimeEngine.registerCondition("fitbit-over-threshold", fitbitCondition);

// Set parameters
const fitbitConditionParameters = {
  criteria: {
    threshold: 100,
    period: TimeEngine.generateCriteriaPeriod(
      "now", "minus", { minutes: 30 },
      "now", "plus", { hours: 0 }
    )
  }
};
const emailActionParameters = {
  message: "It's been 30 minutes. Take a break from your screen!",
};

// Register task
const conditionParametersList = [
  { name: "fitbit-over-threshold", parameters: fitbitConditionParameters },
];
const actionParametersList = [
  { name: "take-a-break-message", parameters: emailActionParameters },
];

TimeEngine.registerOneUserTaskWithCronConditionListActionList(
  "take-a-break",
  "*/30 * * * 1-5",
  conditionParametersList,
  actionParametersList
);

// Start engine
TimeEngine.start();
```

---

### References
- Complete code example: [legacy fitbit-break engine](../contrib/legacy/fitbit-break/engine.mjs)
