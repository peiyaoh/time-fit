import TimeEngine from "@time-fit/time-engine/TimeEngine.js";
import CustomEmailAction from "@time-fit/action-collection/CustomEmailAction";
import HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition from "@time-fit/data-source/fitbit/condition/HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition";

const newAction = new CustomEmailAction();
TimeEngine.registerAction("take-a-break-message", newAction);

const fitbitCondition =
  new HasFitbitStepCountOverThresholdForPersonDuringPeriodCondition();
TimeEngine.registerCondition("fitbit-over-threshold", fitbitCondition);

let fitbitConditionParameters = {};
fitbitConditionParameters.criteria.threshold = 100; 
fitbitConditionParameters.criteria.period = TimeEngine.generateCriteriaPeriod("now", "minus", { minutes: 30 }, "now", "plus", { hours: 0 });

const conditionParametersList = [
  {
    name: "fitbit-over-threshold",
    parameters: fitbitConditionParameters,
  },
];

const emailActionParameters = {
  message: "It's 30 minutes already. Take a break from your screen!",
};

const actionParametersList = [
  {
    name: "take-a-break-message",
    parameters: emailActionParameters,
  },
];
// register a new task that will be executed periodically
TimeEngine.registerOneUserTaskWithCronConditionListActionList(
  "take-a-break",
  "*/30 * * * 1-5",
  conditionParametersList,
  actionParametersList
);

// Start the time engine
TimeEngine.start();
