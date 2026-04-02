import DateTimeHelper from "../../../helper/DateTimeHelper.js";
import UserInfoHelper from "../../../helper/UserInfoHelper.js";
import UpdateDiffHelper from "../../../helper/UpdateDiffHelper.js";
import DataRecordHelper from "../../DataRecordHelper.js";
import FitbitAPIHelper from "./FitbitAPIHelper.js";

import { getPrismaClient } from "../../../helper/prisma.js";
import { DateTime } from "luxon";

export default class FitbitDataHelper {
  constructor() {}

  static async findFitbitDataByCriteria(criteria) {
    const fitbitDataList = await getPrismaClient().fitbit_data.findMany(
      criteria
    );
    return fitbitDataList;
  }

  static generateCompositeIDForFitbitUpdate(aList = []) {
    return aList.join("_");
  }

  static async getUserFitbitActivityDataDuringPeriodById(
    fitbitId,
    startDateString,
    endDateString
  ) {
    const recordList = await getPrismaClient().fitbit_data.findMany({
      where: {
        ownerId: fitbitId,
        dataType: FitbitAPIHelper.FITBIT_INTRADAY_DATA_TYPE_ACTIVITY_SUMMARY,
        dateTime: {
          gte: startDateString,
          lte: endDateString,
        },
      },
    });

    return recordList;
  }

  static async getUserFitbitDailyStepsForWearingDaysDuringPeriodById(
    fitbitId,
    startDateString,
    endDateString,
    goalType,
    wearingLowerBoundMinutes,
    recentLimit
  ) {
    const dateStepsList =
      await FitbitDataHelper.getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById(
        fitbitId,
        startDateString,
        endDateString,
        "steps"
      );

    const wearingDateStepsList = dateStepsList.filter((dateSteps) => {
      return dateSteps.wearingMinutes >= wearingLowerBoundMinutes;
    });

    // get the last three elements of the list
    const recentWearingDateGoalList = wearingDateStepsList.slice(-recentLimit);

    return recentWearingDateGoalList;
  }

  static async getUserFitbitDateAndWearingMinutesListDuringPeriod(
    fitbitId,
    startDateTime,
    endDateTime
  ) {
    let resultList = [];

    let curDateTime = startDateTime;

    while (
      DateTimeHelper.diffDateTime(
        curDateTime,
        endDateTime,
        "seconds"
      ).toObject().seconds >= 0
    ) {
      const aggregatedMinutes =
        await FitbitDataHelper.getUserFitbitHeartRateIntradayMinutesByIdAndDate(
          fitbitId,
          curDateTime
        );

      resultList.push({
        dateTime: curDateTime.toFormat("yyyy-MM-dd"),
        wearingMinutes: aggregatedMinutes,
      });
      // update curDate
      curDateTime = DateTimeHelper.operateDateTime(
        curDateTime,
        { days: 1 },
        "plus"
      );
    }

    return resultList;
  }

  static async getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById(
    fitbitId,
    startDateString,
    endDateString,
    summaryType
  ) {
    let dateStepsList = [];

    //const wearingLowerBoundMinutes = 60 * 8;

    // This is activity-summary, with goals
    const recordList =
      await FitbitDataHelper.getUserFitbitActivityDataDuringPeriodById(
        fitbitId,
        startDateString,
        endDateString
      );

    const startDate = DateTime.fromISO(startDateString);
    const endDate = DateTime.fromISO(endDateString);

    const dateAndMinsList =
      await FitbitDataHelper.getUserFitbitDateAndWearingMinutesListDuringPeriod(
        fitbitId,
        startDate,
        endDate
      );

    // now, start from the ending, find days actual records
    for (let i = 0; i < dateAndMinsList.length; i++) {
      let dateAndSteps = {};
      const dateMins = dateAndMinsList[i];

      let record = undefined;

      for (let j = recordList.length - 1; j >= 0; j--) {
        if (recordList[j].dateTime == dateMins.dateTime) {
          record = recordList[j];
          break;
        }
      }

      if (record == undefined) {
        dateAndSteps = {
          dateTime: dateMins.dateTime,
          steps: 0,
          wearingMinutes: dateMins.wearingMinutes,
        };
      } else {
        dateAndSteps = {
          dateTime: dateMins.dateTime,
          steps: record.content.summary[summaryType],
          wearingMinutes: dateMins.wearingMinutes,
        };
      }
      dateStepsList.push(dateAndSteps);
    }

    return dateStepsList;
  }

  static async queryAndStoreFitbitIntradayDataAtTargetDateForUser(
    userInfo,
    fitbitIntradayDataType,
    targetDate,
    insertToDB = true,
    numOfDays = 1,
    suppressTokenValidation = false
  ) {
    let resultData = {};

    let updatedUserInfo = userInfo;

    if (!suppressTokenValidation) {
      const validateTokenResult = await FitbitAPIHelper.ensureTokenValidForUser(
        userInfo,
        true,
        30 * 60
      );

      if (validateTokenResult.value == "success") {
        updatedUserInfo = validateTokenResult.data;
      } else {
        // cannot update userInfo, need to abort
        return validateTokenResult;
      }
    }

    // use updatedUserInfo from this point

    let resultList = [];
    // now query the data

    for (let i = 0; i < numOfDays; i++) {
      const curDate = targetDate.plus({ days: i });
      let resultObj = {};

      const activityResult =
        await FitbitAPIHelper.getIntradayDataBetweenDateRangeForFitbitId(
          updatedUserInfo.fitbitId,
          fitbitIntradayDataType,
          updatedUserInfo.accessToken,
          curDate,
          curDate
        )
          .then((responseData) => {
            return { value: "success", status: "response", data: responseData };
          })
          .catch((error) => {
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.log(`Data: ${error.response.data}`);
              console.log(`Status: ${error.response.status}`);
              console.log(`StatusText: ${error.response.statusText}`);
              console.log(`Headers: ${error.response.headers}`);

              console.log(`Error response`);

              const { data, status, headers } = error.response;

              const forResponse = { data, status, headers };

              return {
                value: "failed",
                status: "response-error",
                data: forResponse,
              };
            } else if (error.request) {
              // The request was made but no response was received
              // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
              // http.ClientRequest in node.js
              console.log(`[error.request]: ${error.request}`);

              return { value: "failed", status: "no-response", data: {} };
            } else {
              // Something happened in setting up the request that triggered an Error
              // console.log('Error', error.message);

              console.log("Error", error.message);

              return {
                value: "failed",
                status: "request-error",
                data: error.message,
              };
            }
          });

      if (insertToDB == true && activityResult.value == "success") {
        resultData = activityResult.data;

        // now insert the data
        // To Do: decide the schema
        const dataType = fitbitIntradayDataType;

        const dateTime = curDate.toISODate();
        const compositeId = FitbitDataHelper.generateCompositeIDForFitbitUpdate(
          [updatedUserInfo.fitbitId, dataType, dateTime]
        );
        let lastModified = ""; // resultData.activities.length > 0? resultData.activities[0].lastModified: "";

        const oldDocument = await getPrismaClient().fitbit_data.findFirst({
          where: {
            compositeId: compositeId,
          },
        });

        const newDocument = await getPrismaClient().fitbit_data.upsert({
          where: {
            compositeId: compositeId,
          },
          update: {
            lastModified: lastModified,
            content: resultData,
          },
          create: {
            compositeId: compositeId,
            dataType: dataType,
            ownerId: updatedUserInfo.fitbitId,
            dateTime: dateTime,
            lastModified: lastModified,
            content: resultData,
          },
        });

        // now, see if I can calculate the diff
        let documentDiff = {};

        if (oldDocument == null) {
          documentDiff = DataRecordHelper.getObjectAsJSONDiff({}, newDocument);
        } else {
          documentDiff = DataRecordHelper.getObjectAsJSONDiff(
            oldDocument,
            newDocument
          );
        }
        await getPrismaClient().update_diff.create({
          data: {
            collectionName: "fitbit_data",
            documentId: newDocument.id,
            documentDiff: documentDiff,
          },
        });
      }

      resultList.push(activityResult);
    }

    let resultStatus = "success";
    let resultErrorMessage = "";

    for (let i = 0; i < resultList.length; i++) {
      let curResult = resultList[i];
      // one failed is failed
      if (curResult.value == "failed") {
        resultStatus = "failed";
        resultErrorMessage += `${JSON.stringify(curResult.data)} - `;
      }
    }
    return {
      value: resultStatus,
      data: resultErrorMessage,
    };
  }
  static async queryAndStoreFitbitDataByFitbitUpdate(
    fitbitUpdate,
    insertToDB = true
  ) {
    let resultData = {};

    // get the user first
    const userInfo = await UserInfoHelper.getUserInfoByPropertyValue(
      "fitbitId",
      fitbitUpdate.ownerId
    );

    const dateString = fitbitUpdate.date;
    const targetDate = DateTime.fromISO(fitbitUpdate.date);

    const validateTokenResult = await FitbitAPIHelper.ensureTokenValidForUser(
      userInfo,
      true,
      5 * 60
    );

    let updatedUserInfo;

    if (validateTokenResult.value == "success") {
      updatedUserInfo = validateTokenResult.data;
    } else {
      // cannot update userInfo, need to abort
      return validateTokenResult;
    }

    // now, do the following queries with suppressTokenValidation=true

    let suppressTokenValidation = true;
    let resultStatus = "success";
    let resultErrorMessage = "";

    // step intraday
    const intraStepResult =
      await FitbitDataHelper.queryAndStoreFitbitIntradayDataAtTargetDateForUser(
        updatedUserInfo,
        GeneralUtility.FITBIT_INTRADAY_DATA_TYPE_STEP,
        targetDate,
        insertToDB,
        1,
        suppressTokenValidation
      );

    if (intraStepResult.value == "failed") {
      resultStatus = "failed";
      resultErrorMessage += `${intraStepResult.data}`;
    }

    // heart rate intraday
    const intraHeartResult =
      await FitbitDataHelper.queryAndStoreFitbitIntradayDataAtTargetDateForUser(
        updatedUserInfo,
        GeneralUtility.FITBIT_INTRADAY_DATA_TYPE_HEART,
        targetDate,
        insertToDB,
        1,
        suppressTokenValidation
      );

    let intraHeartResultErrorMessage = "";
    if (intraHeartResult.value == "failed") {
      resultStatus = "failed";
      resultErrorMessage += `${intraHeartResult.data}`;
    }

    // activity summary
    const summaryActivityResult =
      await FitbitDataHelper.queryAndStoreFitbitActivitySummaryAtTargetDateForUser(
        updatedUserInfo,
        targetDate,
        insertToDB,
        1,
        suppressTokenValidation
      );

    let summaryActivityStatus =
      summaryActivityResult.value == "success" ? "success" : "failed";

    let summaryActivityResultErrorMessage = "";
    if (summaryActivityResult.value == "failed") {
      resultStatus = "failed";
      resultErrorMessage += `${summaryActivityResult.data}`;
    }

    return {
      value: resultStatus,
      data: resultErrorMessage,
      update: fitbitUpdate,
      body: [
        {
          value: intraStepResult.value,
          ownerId: userInfo.fitbitId,
          dataType: GeneralUtility.FITBIT_INTRADAY_DATA_TYPE_STEP,
          dateTime: dateString,
        },
        {
          value: intraHeartResult.value,
          ownerId: userInfo.fitbitId,
          dataType: GeneralUtility.FITBIT_INTRADAY_DATA_TYPE_HEART,
          dateTime: dateString,
        },
        {
          value: summaryActivityResult.value,
          ownerId: userInfo.fitbitId,
          dataType: FitbitAPIHelper.FITBIT_INTRADAY_DATA_TYPE_ACTIVITY_SUMMARY,
          dateTime: dateString,
        },
      ],
    };
  }

  static async queryAndStoreFitbitActivitySummaryAtTargetDateForUser(
    userInfo,
    targetDate,
    insertToDB = true,
    numOfDays = 1,
    suppressTokenValidation = false
  ) {
    let resultData = {};

    // validate user token first
    // { value: "success", data: userInfo };
    // { value: "failed", data: inspect(error.response.data) };

    let updatedUserInfo = userInfo;

    if (!suppressTokenValidation) {
      const validateTokenResult =
        await FitbitDataHelper.ensureTokenValidForUser(userInfo, true, 30 * 60);

      if (validateTokenResult.value == "success") {
        updatedUserInfo = validateTokenResult.data;
      } else {
        return validateTokenResult;
      }
    }

    let resultList = [];
    // now query the data
    for (let i = 0; i < numOfDays; i++) {
      const curDate = targetDate.plus({ days: i });

      const activityResult =
        await FitbitAPIHelper.getActvitySummaryAtDateForFitbitId(
          updatedUserInfo.fitbitId,
          updatedUserInfo.accessToken,
          curDate
        )
          .then((responseData) => {
            return { value: "success", data: responseData };
          })
          .catch((error) => {
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.log(`Data: ${error.response.data}`);
              console.log(`Status: ${error.response.status}`);
              console.log(`StatusText: ${error.response.statusText}`);
              console.log(`Headers: ${error.response.headers}`);

              console.log(`Error response`);
              // which means, authentication falil
            } else if (error.request) {
              // The request was made but no response was received
              // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
              // http.ClientRequest in node.js
              console.log(error.request);

              console.log(`Error request`);
            } else {
              // Something happened in setting up the request that triggered an Error
              // console.log('Error', error.message);

              console.log("Error else");
            }
            //res.status(error.response.status).json({ response: inspect(error.response.data) });

            const resultObj = eval(`(${inspect(error.response.data)})`);
            return { value: "failed", data: resultObj };
          });

      if (insertToDB == true && activityResult.value == "success") {
        resultData = activityResult.data;

        // now insert the data
        // To Do: decide the schema
        const dataType =
          FitbitAPIHelper.FITBIT_INTRADAY_DATA_TYPE_ACTIVITY_SUMMARY;

        const dateTime = curDate.toISODate();
        const compositeId = FitbitDataHelper.generateCompositeIDForFitbitUpdate(
          [updatedUserInfo.fitbitId, dataType, dateTime]
        );
        const lastModified =
          resultData.activities.length > 0
            ? resultData.activities[0].lastModified
            : "";

        const oldDocument = await getPrismaClient().fitbit_data.findFirst({
          where: {
            compositeId: compositeId,
          },
        });

        const newDocument = await getPrismaClient().fitbit_data.upsert({
          where: {
            compositeId: compositeId,
          },
          update: {
            lastModified: lastModified,
            content: resultData,
          },
          create: {
            compositeId: compositeId,
            dataType: dataType,
            ownerId: updatedUserInfo.fitbitId,
            dateTime: dateTime,
            lastModified: lastModified,
            content: resultData,
          },
        });

        // now, see if I can calculate the diff
        let documentDiff = {};

        if (oldDocument == null) {
          documentDiff = DataRecordHelper.getObjectAsJSONDiff({}, newDocument);
        } else {
          documentDiff = DataRecordHelper.getObjectAsJSONDiff(
            oldDocument,
            newDocument
          );
        }

        await UpdateDiffHelper.insertUpdateDiffList([
          {
            collectionName: "fitbit_data",
            documentId: newDocument.id,
            documentDiff: documentDiff,
          },
        ]);
      }

      resultList.push(activityResult);
    }

    let resultStatus = "success";
    let resultErrorMessage = "";

    for (let i = 0; i < resultList.length; i++) {
      const curResult = resultList[i];
      // one failed is failed
      if (curResult.value == "failed") {
        resultStatus = "failed";
        resultErrorMessage += `${curResult.data} - `;
      }
    }

    return {
      value: resultStatus,
      data: resultErrorMessage,
    };
  }
  static async ensureTokenValidForUser(
    userInfo,
    autoRefresh = false,
    minValidthresholdInSeconds = 8 * 60 * 60
  ) {
    let introspectResult = undefined;

    const myIntrospectResult = await FitbitAPIHelper.myIntrospectToken(
      userInfo.accessToken,
      userInfo.accessToken
    );

    if (myIntrospectResult.type == "response") {
      introspectResult = myIntrospectResult.result;
    } else {
    }

    if (introspectResult != undefined && introspectResult.active == true) {
      const expiredDate = DateTime.fromMillis(introspectResult["exp"]);
      const nowDate = DateTime.now();

      const diffInSeconds = expiredDate.diff(nowDate, "seconds").toObject()[
        "seconds"
      ];

      // token is still valid
      if (autoRefresh == false) {
        return { value: "success", data: userInfo };
      } else {
        if (diffInSeconds > minValidthresholdInSeconds) {
          return { value: "success", data: userInfo };
        } else {
        }
      }
    }

    // accessToken is not valid
    // or, diffInSeconds is small than the minimum tolerable threshold (too close to the expire time)
    const refreshResult = await FitbitAPIHelper.refreshToken(
      userInfo.refreshToken
    )
      .then((responseData) => {
        const newAccessToken = responseData.access_token;

        // If you followed the Authorization Code Flow, you were issued a refresh token. You can use your refresh token to get a new access token in case the one that you currently have has expired. Enter or paste your refresh token below. Also make sure you enteryour data in section 1 and 3 since it's used to refresh your access token.
        const newRefreshToken = responseData.refresh_token;

        return {
          value: "success",
          data: {
            ...userInfo,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        };
      })
      .catch((error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(`Data: ${error.response.data}`);
          console.log(`Status: ${error.response.status}`);
          console.log(`StatusText: ${error.response.statusText}`);
          console.log(`Headers: ${error.response.headers}`);

          console.log(`Error response`);
          // which means, authentication falil
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
        }
        return { value: "failed", data: inspect(error.response.data) };
      });

    if (refreshResult.value == "success") {
      // need to actually update the token
      const updatedUserInfo = await UserInfoHelper.updateToken(
        userInfo.hash,
        refreshResult.data.accessToken,
        refreshResult.data.refreshToken,
        userInfo
      );

      return { value: "success", data: updatedUserInfo };
    }

    return refreshResult;
  }

  static async getUserFitbitWearingMinutesPerDayListDuringPeriod(
    fitbitId,
    startDateTime,
    endDateTime
  ) {
    let minsList = [];

    let curDateTime = startDateTime;

    while (
      DateTimeHelper.diffDateTime(
        curDateTime,
        endDateTime,
        "seconds"
      ).toObject().seconds >= 0
    ) {
      const aggregatedMinutes =
        await FitbitDataHelper.getUserFitbitHeartRateIntradayMinutesByIdAndDate(
          fitbitId,
          curDateTime
        );
      minsList.push(aggregatedMinutes);
      curDateTime = DateTimeHelper.operateDateTime(
        curDateTime,
        { days: 1 },
        "plus"
      );
    }
    return minsList;
  }

  static async getUserFitbitHeartRateIntradayMinutesByIdAndDate(
    fitbitId,
    startDateTime
  ) {
    const timeString = startDateTime.toFormat("yyyy-MM-dd");

    const record = await getPrismaClient().fitbit_data.findFirst({
      where: {
        ownerId: fitbitId,
        dataType: GeneralUtility.FITBIT_INTRADAY_DATA_TYPE_HEART,
        dateTime: timeString,
      },
    });

    let minutesTotal = 0;

    if (record != undefined) {
      // version 2: use intraday
      const heartRateDataSet =
        record["content"]["activities-heart-intraday"]["dataset"];
      minutesTotal += heartRateDataSet.length;
    }

    return minutesTotal;
  }

  static async getUserFitbitActivityListOfCategoryDuringPeriodById(
    fitbitId,
    category = "Walk",
    startDateString,
    endDateString
  ) {
    const recordList =
      await FitbitDataHelper.getUserFitbitActivityDataDuringPeriodById(
        fitbitId,
        startDateString,
        endDateString
      );

    let activityList = [];

    recordList.forEach((record) => {
      if (record.content.activities.length > 0) {
        activityList = activityList.concat(record.content.activities);
      }
    });

    const activityListByCategory = activityList.filter((item) => {
      return item.activityParentName == category;
    });

    return activityListByCategory;
  }
}
