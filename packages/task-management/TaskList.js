export default class TaskList {
  constructor() {}

  static getTaskList() {
    return [
      {
        label: "sample-task",
        enabled: true,
        priority: 50,
        participantIndependent: false,
        preActivationLogging: false,
        ignoreTimezone: false,
        checkPoint: {
          type: "relative",
          reference: {
            weekIndexList: [1, 2, 3, 4, 5, 6, 7],
            type: "preference",
            value: "wakeupTime"
          },
          offset: {
            type: "plus",
            value: { hours: 1 }
          }
        },
        group: {
          type: "all",
          membership: {},
          list: []
        },
        randomization: {
          enabled: true,
          outcome: [
            {
              value: true,
              chance: 1.0,
              action: {
                type: "noAction"
              }
            }
          ]
        },
        preCondition: {
          enabled: false
        }
      }
    ];
  }
}
