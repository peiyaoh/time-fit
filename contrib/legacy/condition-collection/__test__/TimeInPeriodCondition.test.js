import TimeInPeriodCondition from "../TimeInPeriodCondition";
import { DateTime } from "luxon";

describe('time in period', () => {
  test('time between activate and complete', async () => {
    const mockUserInfo = {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      address: "123 Main St, Anytown, USA",
      city: "Anytown",
      state: "CA",
      timezone: "America/New_York",
      activateAt: "2021-01-01T00:00:00Z",
      completeAt: "2021-01-30T00:00:00Z",
    };

    const condition = {
      criteria: {
        period: {
          start: {
            reference: "activateAt",
            startOrEnd: "start",
            startEndUnit: "day",
          },
          end: {
            reference: "completeAt",
            startOrEnd: "end",
            startEndUnit: "day",
          },
        },
        inclusive: true,
      },
    };

    const mockDateTime = DateTime.fromISO("2021-01-15T00:00:00Z");

    const compositeResult = await TimeInPeriodCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: mockDateTime,
    });

    expect(compositeResult.result).toBe(true);


    // create a new mockDateTime
    const mockDateTime2 = DateTime.fromISO("2021-01-31T00:00:00Z");

    const compositeResult2 = await TimeInPeriodCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: mockDateTime2,
    }); 

    expect(compositeResult2.result).toBe(false);

  });

  test('time between activate and now', async () => {
    const mockUserInfo = {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      address: "123 Main St, Anytown, USA",
      city: "Anytown",
      state: "CA",
      timezone: "America/New_York",
      activateAt: "2021-01-01T00:00:00Z",
      completeAt: "2021-01-30T00:00:00Z",
    };

    const condition = {
      criteria: {
        period: {
          start: {
            reference: "activateAt",
            startOrEnd: "start",
            startEndUnit: "day",
          },
          end: {
            reference: "now",
            startOrEnd: "no",
            startEndUnit: "day",
          },
        },
        inclusive: true,
      },
    };

    const mockDateTime = DateTime.fromISO("2021-01-15T00:00:00Z");

    const compositeResult = await TimeInPeriodCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: mockDateTime,
    });

    expect(compositeResult.result).toBe(true);


    // create a new mockDateTime
    const mockDateTime2 = DateTime.fromISO("2026-01-02T00:00:00Z");

    const compositeResult2 = await TimeInPeriodCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: mockDateTime2,
    }); 

    expect(compositeResult2.result).toBe(true);

    // create a new mockDateTime that is before activate
    const mockDateTime3 = DateTime.fromISO("2020-12-31T00:00:00Z");

    const compositeResult3 = await TimeInPeriodCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: mockDateTime3,
    }); 

    expect(compositeResult3.result).toBe(false);

  });
});