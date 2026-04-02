export default class TaskGeneratorHelper {
  constructor() {}

  static generateSystemTaskWithCronAction(
    taskLabel,
    cronExpression,
    actionType,
    participantIndependent = true,
    ignoreTimezone = true
  ) {
    return {
      label: taskLabel,
      enabled: true,
      priority: 100,
      participantIndependent: participantIndependent,
      preActivationLogging: false,
      ignoreTimezone: ignoreTimezone,
      checkPoints: {
        enabled: true,
        pointList: [
          {
            type: "relative",
            reference: {
              type: "cron",
              value: cronExpression,
            },
            offset: {
              type: "plus",
              value: { hours: 0 },
            },
          },
        ],
      },
      group: {
        type: "all",
      },
      outcomes: {
        randomizationEnabled: false,
        outcomeList: [
          {
            chance: 1.0,
            action: {
              type: actionType,
            },
          },
        ],
      },
      preCondition: { enabled: false },
    };
  }

  static generaetOneUserTaskWithCronConditionListActionList(
    taskLabel,
    cronExpression,
    conditionParametersList,
    conditionListOperator = "and",
    actionParametersList,
    participantIndependent = true,
    ignoreTimezone = true
  ) {
    return {
      label: taskLabel,
      enabled: true,
      priority: 100,
      participantIndependent: participantIndependent,
      preActivationLogging: false,
      ignoreTimezone: ignoreTimezone,
      checkPoints: {
        enabled: true,
        pointList: [
          {
            type: "relative",
            reference: {
              type: "cron",
              value: cronExpression,
            },
            offset: {
              type: "plus",
              value: { hours: 0 },
            },
          },
        ],
      },
      group: {
        type: "all",
      },
      outcomes: {
        randomizationEnabled: actionParametersList.length > 1,
        outcomeList: actionParametersList.map((actionNameParameters) => {
          return {
            chance: actionNameParameters.chance
              ? actionNameParameters.chance
              : 1.0 / actionParametersList.length,
            action: {
              type: actionNameParameters.name,
              parameters: actionNameParameters.parameters,
            },
          };
        }),
      },
      preCondition: {
        enabled: conditionParametersList.length > 0,
        conditionRelationship: conditionListOperator
          ? conditionListOperator
          : "and",
        conditionList: conditionParametersList.map(
          (conditionNameParameters) => {
            return {
              type: conditionNameParameters.name,
              parameters: conditionNameParameters.parameters,
            };
          }
        ),
      },
    };
  }

  static generateCriteriaPeriod(
    referenceStart,
    offsetTypeStart,
    offsetValueStart,
    referenceEnd,
    offsetTypeEnd,
    offsetValueEnd
  ) {
    return {
      start: {
        reference: referenceStart,
        offset: { type: offsetTypeStart, value: offsetValueStart },
      },
      end: {
        reference: referenceEnd,
        offset: { type: offsetTypeEnd, value: offsetValueEnd },
      },
    };
  }
}
