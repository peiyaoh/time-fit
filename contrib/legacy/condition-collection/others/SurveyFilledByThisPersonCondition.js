import BooleanHelper from "../../helper/BooleanHelper";
import DateTimeHelper from "../../helper/DateTimeHelper";
import SurveyResponseHelper from "../../helper/SurveyResponseHelper";

export default class SurveyFilledByThisPersonCondition {
  constructor() {}
  static async execute(condition, params) {
    const { userInfo, datetime } = params;
    const dateTimeUTC = datetime.toUTC();
    const localTimeForUser = DateTimeHelper.getLocalTime(
      dateTimeUTC,
      userInfo.timezone
    );

    const startDate = DateTimeHelper.generateStartOrEndDateTimeByReference(
      localTimeForUser,
      userInfo,
      condition.criteria.period.start
    );

    const endDate = DateTimeHelper.generateStartOrEndDateTimeByReference(
      localTimeForUser,
      userInfo,
      condition.criteria.period.end
    );

    let surveyFillResultList = [];
    let surveyResponseTimeListMap = {};

    for (let i = 0; i < condition.criteria.idList.length; i++) {
      const surveyId = condition.criteria.idList[i];
      const responseList =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate
        );

      const filteredResponseList = responseList.filter((responseInfo) => {
        return responseInfo.participantId == userInfo.username;
      });

      surveyResponseTimeListMap[surveyId] = filteredResponseList.map(
        (responseInfo) => {
          return responseInfo.dateTime;
        }
      );

      surveyFillResultList.push(filteredResponseList.length > 0);
    }

    result = BooleanHelper.reduceBooleanArray(
      surveyFillResultList,
      condition.criteria.idRelationship
    );

    const recordInfo = {
      surveyResponseTimeListMap: surveyResponseTimeListMap,
    };

    return {
      result,
      recordInfo,
    };
  }
}
