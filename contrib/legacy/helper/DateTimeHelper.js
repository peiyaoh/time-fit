import { CronExpressionParser } from "cron-parser";
import { DateTime, Interval } from "luxon";
export default class DateTimeHelper {
  constructor() {}

  static getLocalDateTime(datetime, timezone) {
    return datetime.setZone(timezone);
  }
  static diffDateTime(datetimeA, datetimeB, unit) {
    return datetimeB.diff(datetimeA, unit);
  }

  static matchCronExpreesionAndDate(cronExpressionString, date) {
    const cronExpression = CronExpressionParser.parse(cronExpressionString);
    return cronExpression.includesDate(date);
  }

  static isDateStringWithinInterval(
    dateString,
    dateStringTimezone,
    startDateTime,
    endDateTime
  ) {
    const targetDateTime = DateTime.fromISO(dateString, {
      zone: dateStringTimezone,
    });
    return DateTimeHelper.isDatTimeWithinInterval(
      targetDateTime,
      startDateTime,
      endDateTime
    );
  }

  static isDatTimeWithinInterval(dateTime, startDateTime, endDateTime) {
    const validInterval = Interval.fromDateTimes(startDateTime, endDateTime);
    const result = validInterval.contains(dateTime);
    return result;
  }

  static generateStartOrEndDateTimeByReference(
    targetDateTime,
    userInfo,
    timeDefinition
  ) {
    let resultDateTime;
    const startEndOfUnit = timeDefinition.startOrEnd;
    const startEndUnit = timeDefinition.startEndUnit;

    resultDateTime = DateTimeHelper.generateDateTimeByReference(
      targetDateTime,
      userInfo,
      timeDefinition.reference,
      startEndOfUnit,
      startEndUnit
    );

    // offset if necessary
    if (timeDefinition.offset != undefined) {
      resultDateTime = DateTimeHelper.operateDateTime(
        resultDateTime,
        timeDefinition.offset.value,
        timeDefinition.offset.type
      );
    }
    return resultDateTime;
  }

  static generateDateTimeByReference(
    targetDateTime,
    userInfo,
    reference,
    startEndOfUnit = "no",
    startEndUnit = "day"
  ) {
    let resultDateTime = undefined;

    switch (reference) {
      case "now":
        resultDateTime = targetDateTime;
        break;
      default:
        resultDateTime = DateTimeHelper.getLocalDateTime(
          DateTime.fromISO(userInfo[reference]),
          userInfo.timezone
        );
        break;
    }

    switch (startEndOfUnit) {
      case "start":
        resultDateTime = resultDateTime.startOf(startEndUnit);
        break;
      case "end":
        resultDateTime = resultDateTime.endOf(startEndUnit);
        break;
      default:
        break;
    }

    return resultDateTime;
  }

  static operateDateTime(dateTime, offset, operator) {
    let result = undefined;
    switch (operator) {
      case "plus":
        result = dateTime.plus(offset);
        break;
      case "minus":
        result = dateTime.minus(offset);
        break;
      default:
        break;
    }

    return result;
  }

  static getLastWeekAsIntervalFromDateTime(nowDateTime = DateTime.now()) {
    const start = nowDateTime.minus({ days: 7 }).startOf("week");
    const end = nowDateTime.minus({ days: 7 }).endOf("week");

    return Interval.fromDateTimes(start, end);
  }
}
