import DateTimeHelper from "@time-fit/helper/DateTimeHelper.js";

export default class TimeInPeriodCondition {
  constructor() {}
  static async execute(condition, params) {
    const { userInfo, datetime } = params;
    const dateTimeUTC = datetime.toUTC();
    const localTimeForUser = DateTimeHelper.getLocalDateTime(
      dateTimeUTC,
      userInfo.timezone
    );

    // v2
    /*
    const sampleCriteria = {
      start: {
        reference: "activateAt",
        startOrEnd: "start", // start, end, no
        startEndUnit: "day",
        offset: { type: "plus", value: { days: 7 } },
      },

      end: {
        reference: "activateAt",
        startOrEnd: "end", // start, end, no
        startEndUnit: "day",
        offset: { type: "plus", value: { days: 14 } },
      },
    };
    */

    const startDateTime = DateTimeHelper.generateStartOrEndDateTimeByReference(
      localTimeForUser,
      userInfo,
      condition.criteria.period.start
    );

    let endDateTime = DateTimeHelper.generateStartOrEndDateTimeByReference(
      localTimeForUser,
      userInfo,
      condition.criteria.period.end
    );

    // default to be inclusive
    const inclusive = condition.criteria.period.inclusive;
    if (inclusive == undefined || inclusive == true) {
      // inclusive
      endDateTime = endDateTime.plus({ milliseconds: 1 });
    }

    const result = DateTimeHelper.isDatTimeWithinInterval(
      dateTimeUTC,
      startDateTime,
      endDateTime
    );

    const recordInfo = {
      datetime: datetime,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    };

    return {
      result,
      recordInfo,
    };
  }
}
