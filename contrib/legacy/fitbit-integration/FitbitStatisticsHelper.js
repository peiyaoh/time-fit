import FitbitDataHelper from "./FitbitDataHelper";

export default class FitbitStatisticsHelper {
  constructor() {}

  static async getUserFitbitAverageDailyStepsDuringPeriodById(
    fitbitId,
    startDateString,
    endDateString
  ) {
    const recordList =
      await FitbitDataHelper.getUserFitbitActivityDataDuringPeriodById(
        fitbitId,
        startDateString,
        endDateString
      );

    const stepsList = recordList.map((record) => {
      if (record.content.summary != undefined) {
        return record.content.summary.steps;
      } else {
        return 0;
      }
    });

    const sum = stepsList.reduce((partialSum, a) => partialSum + a, 0);
    const averageSteps = stepsList.length > 0 ? sum / stepsList.length : 0;
    return averageSteps;
  }

  static filterFitbitActivityListByDuration(
    activityList,
    minDurationInSeconds = 10 * 60
  ) {
    return activityList.filter((record) => {
      return record.duration / 1000 >= minDurationInSeconds;
    });
  }
}
