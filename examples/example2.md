# Example 2: Nudge all users who did not have enough steps count to take a break every 30 minutes during week days

In this example, we will create a simple nudging intervention that sends a message through email to users who did not have enought step count (e.g., 100) in the last 30 minutes, every 30 minutes during week days. A Fitbit wristband is used to measure step count. This example will show you how to develop an intervention that is a adapted to one's sensor data (Fitbit).

You can run this example by running the following command in the project folder:

```
yarn engine
```


## How to

To setup this project, you will need
- A server with a domain name (e.g., https://fitbitbreak.io)
- A Fitbit developer account (free)
- A Mailjet account (free) for sending emails

For this intervention, you will need two components to make this work
- A server that provide a web interface for users to authorize your app to access their Fitbigt data.
- A engine that will execute the decision rules to decide whether it is time to intervene and if so, deliver the intervention through email.

As developing a web application is not the focus of this framework, we will focus on developing the decision rule in this tutorial.

Here is the step by step guide to create this intervention.

### Create the app

Create a folder called my-app2 under /apps and create an index.js file inside the /apps/my-app2 folder.

### Step 1: Import TimeEngine

In TimeFit, the TimeEngine is the main entry point of the framework. It is responsible for managing the execution of everything (or "tasks"). You will do everything through TimeEngine.


```javascript
import TimeEngine from "@time-fit/time-engine/TimeEngine.js";
```
### Step 2: Register an action that will send emails to users.

In `TimeFit`, each task will decide whether to perofrom an action such as sending out a push notification or an email. This framework provides a collection of action, under `action-collection` module, that developers can use to deliver content-based interventions.

First, import the `CustomEmailAction` provided by the framework.

Second, create an instance using `new`.

Third, register this action to the engine and give it a name, "take-a-break-message." You can use this name later when creating a task that specifies when such action should be carried out.

```javascript
import CustomEmailAction from "@time-fit/action-collection/CustomEmailAction";
const newAction = new CustomEmailAction();
TimeEngine.registerAction("take-a-break-message", newAction);
```

### Step 3: Register a condition that will check Fitbit step counts

In `TimeFit`, each task has the capability to check a series of conditions, in addition to time, to determine whether to deliver an intervention. For simpple time-based intervention that will be considered at a regular bassis, checking time is enough. However, an advanced condition could be developed to enhance the intervention adaptation to a user's state and context (e.g., step count). The `TimeFit` framework provides a collection of condition, and also separatedly under `data-source/fitbit/condition` for Fitbit specific conditions, that developers can use to quickly construct complex interventions. See below for how to check step count from Fitbit to decide whether to intervene.

First, import the `HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition` provided by the framework.

Second, create an instance using `new`.

Third, register this condition to the engine and give it a name, "fitbit-over-threshold." You can use this name later when creating a task that specifies a condition that needs to be satisfied for an action to be considered.

```javascript
import HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition from "@time-fit/data-source/fitbit/condition/HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition";
const fitbitCondition =
  new HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition();
TimeEngine.registerCondition("fitbit-over-threshold", fitbitCondition);
```

### Step 4: Provide parameters for the Fitbit condition to check step counts over the last 30 minutes
As we discussed in the previous step, in `TimeFit`, we can specify a list of conditions that need to be satisfied before a task/action to be considered. The conditions are designed to accept parameters to configure what is being checked. Condition-specific parameters will be stored in a property named `criteria`.

In the case of `HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition`, the first parameter to specify is the threshold of step count, such as 100.

The second parameter to specify is the period of time we consider when checking step counts. The `TimeEngine` provides a function, `generateCriteriaPeriod()`,  to specify a period of time. You can specify the following parameters to the function:

**`generateCriteriaPeriod` parameters:**

| Parameter                | Description                          | Example         |
|--------------------------|--------------------------------------|-----------------|
| Period start reference   | Start point (e.g., "now")            | "now"           |
| Period start offset type | "plus" or "minus"                    | "minus"         |
| Period start offset      | Offset object                        | { minutes: 30 } |
| Period end reference     | End point                            | "now"           |
| Period end offset type   | "plus" or "minus"                    | "plus"          |
| Period end offset        | Offset object                        | { hours: 0 }    |

```javascript
let fitbitConditionParameters = {};
fitbitConditionParameters.criteria.threshold = 100; 
fitbitConditionParameters.criteria.period = TimeEngine.generateCriteriaPeriod("now", "minus", { minutes: 30 }, "now", "plus", { hours: 0 });
```

### Step 5: Provide parameters for the email action to send a message
In `TimeFit`, a action is designed to accept parameters to configure its beahvior.

In the case of `CustomEmailAction`, the first parameter to specify is the content of the email, such as "It's 30 minutes already. Take a break from your screen!" The action is designed to autmatically extract the email from user information from the database to send this email. That means, this action will use the email associated with each user to send the email. No additional parameter is needed.

```javascript
const emailActionParameters = {
  message: "It's 30 minutes already. Take a break from your screen!",
};
```


### Step 6: Register a new task that will be executed periodically (every 30 minutes)

In `TimeFit`, all the logic is defined in the form of tasks. For this sample application, we want this task to be carried out for every user, so we will use a "user task" provided by the framework to execute an action periodically.

In this example, we will register a user task using `registerOneUserTaskWithCronConditionListActionList`, which creates a task that will be executed at a certain time for every user. We will supply the task label, the cron expression that determines the timing of when this task should be considered, a list of condition that need to be satisfied, and a list of actions to be considered as intervention. Note that by default, all conditions need to be satisfied for any action to be considered. If multiple actions are provided, each action will have equal chance to be selected by default. Addition parameters can be provided to configure the beahvior of using conditions and actions.

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

### Step 7: Run the app

Finally, we will start the time engine to begin the nudging intervention.

```javascript
TimeEngine.start();
```

In the temrinal, run
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
let fitbitConditionParameters = {
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
