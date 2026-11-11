import TaskExecutor from "../TaskExecutor.js";

describe('checkpoint-spec', () => {
  test('12:00 PM will match properly', () => {
    // static isCheckPointForUser(checkPoints, userInfo, now) 
    const mockCheckPoints = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "spec",
            value: {
              dateCriteria: {
                weekIndexList: [1, 2, 3, 4, 5],
              },
              timeStringType: "fixed",
              timeString: "12:00 PM",
            },
          },
          offset: {
            type: "plus",
            value: { hours: 0 },
          },
        },
      ],
    };
    const mockUserInfo = {
      username: "test",
      timezone: "America/New_York",
    };

    // create a Date that is at a Friday in 2025 March 14th
    const mockDate1 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate1)[0]).toBe(true);

    // create a Date that is at a Saturday in 2025 March 15th
    const mockDate2 = new Date("2025-03-15T12:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate2)[0]).toBe(false);

    // create a Date in 2025 that is at 12:01 pm on Friday in March
    const mockDate3 = new Date("2025-03-14T12:01:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate3)[0]).toBe(false);
    

    // create another mock checkpoints with the same settings
    const mockCheckPoints2 = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "spec",
            value: {
              dateCriteria: {
                weekIndexList: [1, 2, 3, 4, 5],
              },
              timeStringType: "fixed",
              timeString: "12:00 PM",
            },
          },
          offset: {
            type: "plus",
            value: { hours: 1 },
          },
        },
      ],
    };

    // create a Date that is at 01:00 PM on a Friday in March 2025
    const mockDate4 = new Date("2025-03-14T13:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate4)[0]).toBe(true);
    
    // create a Date that is at 12:00 PM on a Friday in March 2025
    const mockDate5 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate5)[0]).toBe(false);

    // create another mock checkPoints that combine the two
    const mockCheckPoints3 = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "spec",
            value: {
              dateCriteria: {
                weekIndexList: [1, 2, 3, 4, 5],
              },
              timeStringType: "fixed",
              timeString: "12:00 PM",
            },
          },
          offset: {
            type: "plus",
            value: { hours: 0 },
          },
        },
        {
          type: "relative",
          reference: {
            type: "spec",
            value: {
              dateCriteria: {
                weekIndexList: [1, 2, 3, 4, 5],
              },
              timeStringType: "fixed",
              timeString: "12:00 PM",
            },
          },
          offset: {
            type: "plus",
            value: { hours: 1 },
          },
        },
      ],
    };

    // create a Date that is at 12:00 PM on a Friday in March 2025
    const mockDate6 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints3, mockUserInfo, mockDate6)[0]).toBe(true);

    // create a Date that is at 01:00 PM on a Friday in March 2025
    const mockDate7 = new Date("2025-03-14T13:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints3, mockUserInfo, mockDate7)[0]).toBe(true);

  });
});


describe('checkpoint-preference', () => {
  test('User preference time will match properly', () => {
    const mockCheckPoints = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "spec",
            value: {
              dateCriteria: {
                weekIndexList: [1, 2, 3, 4, 5],
              },
              timeStringType: "preference",
              timeString: "wakeupTime",
            },
          },
          offset: {
            type: "plus",
            value: { hours: 0 },
          },
        },
      ],
    };
    const mockUserInfo = {
      username: "test",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      }
    };

    // create a timestring extraction function that will return 12:00 PM
    const mockTimeStringExtractionFunction = (userInfo,
      checkPoint,
      preferenceTimeStringName,
      date
    ) => {
      return userInfo.preference["wakeup"];
    };

    TaskExecutor.registerCheckPointPreferenceTimeStringExtractionFunction(mockTimeStringExtractionFunction);

    // create a Date that is at a Friday in 2025 March 14th
    const mockDate1 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate1)[0]).toBe(true);

    // create a date that is at 01:00 PM on a Friday in March 2025
    const mockDate2 = new Date("2025-03-14T13:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate2)[0]).toBe(false);


  });
});


describe('checkpoint-cron', () => {
  test('Cron time will match properly', () => {
    const mockCheckPoints = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "cron",
            // a cron expression that will match every Friday at 12:00 PM
            value: "0 12 * * 5",
          },
          offset: {
            type: "plus",
            value: { hours: 0 },
          },
        },
      ],
    };
    const mockUserInfo = {
      username: "test",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      }
    };

    // create a timestring extraction function that will return 12:00 PM
    const mockTimeStringExtractionFunction = (userInfo,
      checkPoint,
      preferenceTimeStringName,
      date
    ) => {
      console.log(`${preferenceTimeStringName}: ` + userInfo.preference["wakeup"]);
      return userInfo.preference["wakeup"];
    };

    TaskExecutor.registerCheckPointPreferenceTimeStringExtractionFunction(mockTimeStringExtractionFunction);

    // create a Date that is at a Friday in 2025 March 14th
    const mockDate1 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate1)[0]).toBe(true);

    // create a date that is at 01:00 PM on a Friday in March 2025
    const mockDate2 = new Date("2025-03-14T13:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints, mockUserInfo, mockDate2)[0]).toBe(false);


    // create a simlilar mock checkpoints with 1 hour offset
    const mockCheckPoints2 = {
      enabled: true,
      pointList: [
        {
          type: "relative",
          reference: {
            type: "cron",
            // a cron expression that will match every Friday at 12:00 PM
            value: "0 12 * * 5",
          },
          offset: {
            type: "plus",
            value: { hours: 1 },
          },
        },
      ],
    };

    // create a Date that is at 01:00 PM on a Friday in March 2025
    const mockDate3 = new Date("2025-03-14T13:00:00.000-04:00");
    // this should be true
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate3)[0]).toBe(true);

    // create a Date that is at 12:00 PM on a Friday in March 2025
    const mockDate4 = new Date("2025-03-14T12:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate4)[0]).toBe(false);

    // create a Date for Thursday at 12:00 PM
    const mockDate5 = new Date("2025-03-13T12:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate5)[0]).toBe(false);

    // create a Date for Thursday at 1 pm
    const mockDate6 = new Date("2025-03-13T13:00:00.000-04:00");
    // this should be false
    expect(TaskExecutor.isCheckPointForUser(mockCheckPoints2, mockUserInfo, mockDate6)[0]).toBe(false);
  });
});



describe('group-all', () => {
  test('Anyone will match', () => {
    const mockGroupCriteria = {
      type: "all",
      membership: {
        gif: [],
        salience: [],
        modification: [],
      },
      list: [],
    };
    const mockUserInfo = {
      username: "test",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: [true],
        salience: [true],
        modification: [true]
      }
    };

    // use TaskExecutor.isGroupForUser to check
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo)[0]).toBe(true);

    // create another mockUserInfo that does not have the membership
    const mockUserInfo2 = {
      username: "test",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
      }
    };

    // use TaskExecutor.isGroupForUser to check. Should be true as anyone will pass
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo2)[0]).toBe(true);
  });
});

describe('group-list', () => {
  test('Usernames on the list will match', () => {
    const mockGroupCriteria = {
      type: "list",
      membership: {
        gif: [],
        salience: [],
        modification: [],
      },
      list: ["test1", "test2"],
    };
    const mockUserInfo = {
      username: "test1",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: [true],
        salience: [true],
        modification: [true]
      }
    };

    const mockUserInfo2 = {
      username: "test3",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: [true],
        salience: [true],
        modification: [true]
      }
    };

    // first one will be true
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo)[0]).toBe(true);

    // second one will be false
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo2)[0]).toBe(false);
  });
});


describe('group-membership', () => {
  test('User with the right membership will match', () => {
    const mockGroupCriteria = {
      type: "group",
      membership: {
        gif: [true],
        salience: [false],
        modification: [],
      },
      list: [],
    };
    const mockUserInfo1 = {
      username: "test1",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: true,
        salience: undefined,
        modification: undefined,
      }
    };

    const mockUserInfo2 = {
      username: "test2",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: false,
        salience: undefined,
        modification: true
      }
    };

    const mockUserInfo3 = {
      username: "test3",
      timezone: "America/New_York",
      preference: {
        wakeup: "12:00 PM",
      },
      groupMembership: {
        gif: false,
        salience: false,
        modification: true,
      }
    };

    // first one will be true
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo1)[0]).toBe(true);

    // second one will be false
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo2)[0]).toBe(false);

    // third one will be true
    expect(TaskExecutor.isGroupForUser(mockGroupCriteria, mockUserInfo3)[0]).toBe(true);
  });
});


describe('randomize choice', () => {
  test('First choice when no randomization', () => {
    const mockOutcomes1 = {
      randomizationEnabled: false,
      outcomeList: [
        {
          chance: 0.5,
          action: {
            type: "printHello",
          },
        },
        {
          chance: 0.5,
          action: {
            type: "printHello2",
          },
        },
      ],
    };

    // use TaskExecutor.obtainChoiceWithRandomization to check
    for (let i = 0; i < 100; i++) {
      expect(TaskExecutor.obtainChoiceWithRandomization(mockOutcomes1)["theChoice"].action.type == "printHello").toBe(true);
    }

    const mockRandomization2 = {
      randomizationEnabled: true, // true or false
      outcomeList: [
        {
          chance: 1.0,
          action: {
            type: "printHello",
          },
        },
        {
          chance: 0,
          action: {
            type: "printHello2",
          },
        },
      ],
    };

    // use TaskExecutor.obtainChoiceWithRandomization to check
    // test it 100 times and all of them should be printHello
    for (let i = 0; i < 100; i++) {
      expect(TaskExecutor.obtainChoiceWithRandomization(mockRandomization2)["theChoice"].action.type == "printHello").toBe(true);
    }

    // create another mockRandomization that has 0.5 chance for each
    const mockRandomization3 = {
      randomizationEnabled: true, // true or false
      outcomeList: [
        {
          chance: 0.5,
          action: {
            type: "printHello",
          },
        },
        {
          chance: 0.5,
          action: {
            type: "printHello2",
          },
        },
      ],
    };

    // do it 1000 times and check if the probability is close to 0.5
    let printHelloCount = 0;
    let printHello2Count = 0;
    for (let i = 0; i < 1000; i++) {
      if (TaskExecutor.obtainChoiceWithRandomization(mockRandomization3)["theChoice"].action.type == "printHello") {
        printHelloCount++;
      } else {
        printHello2Count++;
      }
    }
    expect(Math.abs(printHelloCount - printHello2Count) < 100).toBe(true);

    // expect printHelloCount/1000 to be close to 0.5
    expect(Math.abs(printHelloCount/1000 - 0.5) < 0.1).toBe(true);

    // expect printHello2Count/1000 to be close to 0.5
    expect(Math.abs(printHello2Count/1000 - 0.5) < 0.1).toBe(true);




  });
});
