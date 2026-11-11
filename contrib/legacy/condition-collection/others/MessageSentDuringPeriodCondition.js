import DateTimeHelper from "../../helper/DateTimeHelper";
import TaskLogHelper from "../../helper/TaskLogHelper";

export default class MessageSentDuringPeriodCondition {
  constructor() {}
  static async execute(condition, params) {
    const { userInfo, datetime } = params;
    const dateTimeUTC = datetime.toUTC();
    const localTimeForUser = DateTimeHelper.getLocalTime(
      dateTimeUTC,
      userInfo.timezone
    );

    startDate = undefined;
    endDate = undefined;

    const startDate =
      DateTimeHelper.generateStartOrEndDateTimeByReference(
        localTimeForUser,
        userInfo,
        condition.criteria.period.start
      );


    const endDate = DateTimeHelper.generateStartOrEndDateTimeByReference(
      localTimeForUser,
      userInfo,
      condition.criteria.period.end
    );

    const taskLogList =
      await TaskLogHelper.findTaskLogWithMessageLabelDuringPeriod(
        condition.criteria.messageLabel,
        startDate,
        endDate
      );

    // now, filter by the person, and messageLabel
    const filteredTaskLogList = taskLogList.filter((taskLogInfo) => {
      return taskLogInfo.username == userInfo.username;
    });

    const recordInfo = {
      messageSentCount: filteredTaskLogList.length,
      messageSentTimeList: filteredTaskLogList.map((taskLogInfo) => {
        return taskLogInfo.createdAt;
      }),
    };

    result = filteredTaskLogList.length > 0;

    return {
      result,
      recordInfo,
    };
  }
}
