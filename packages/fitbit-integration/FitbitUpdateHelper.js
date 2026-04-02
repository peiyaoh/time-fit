import DateTimeHelper from "../../../helper/DateTimeHelper.js";
import UserInfoHelper from "../../../helper/UserInfoHelper.js";
import { getPrismaClient } from "../../../helper/prisma.js";
import FitbitDataHelper from "./FitbitDataHelper.js";

export default class FitbitUpdateHelper {
  constructor() {}

  static async findFitbitUpdateByCriteria(
    criteria
  ) {
    const fitbitUpdateList = await getPrismaClient().fitbit_update.findMany(criteria);
    return fitbitUpdateList;
  }

  static async insertFitbitUpdateList(updateList) {
    const createResult = await getPrismaClient().fitbit_update.createMany({
      data: updateList,
    });
    return createResult;s
  }

  static async updateFitbitUpdateStatusWithSameSignatureBeforeTime(
    fUpdate,
    oldStatus = "notification",
    newStatus = "processed",
    timestamp
  ) {
    const updateOlderList = await getPrismaClient().fitbit_update.updateMany({
      where: {
        status: oldStatus,
        ownerId: fUpdate.ownerId,
        collectionType: fUpdate.collectionType,
        date: fUpdate.date,
        createdAt: {
          lte: timestamp,
        },
      },
      data: {
        status: newStatus,
      },
    });

    return updateOlderList;
  }

  static async isFitbitUpdateDateWithinAppropriateScope(fitbitUpdate) {
    const aUser = await UserInfoHelper.getUserInfoByPropertyValue("fitbitId", fitbitUpdate.ownerId);

    if (aUser == undefined) {
      return false;
    }

    const userInfo = aUser; 

    const timezone = userInfo.timezone;

    const dateString = fitbitUpdate.date;

    const now = DateTime.now();

    const startTimeSpec =
      userInfo["joinAt"] != undefined
        ? {
            reference: "joinAt",
            offset: { type: "plus", value: { hours: 0 } },
            startOrEnd: "start",
            startEndUnit: "day",
          }
        : undefined;

    if (startTimeSpec == undefined) {
      // if you have not join the study for that date, this Fitbit update should be not processed.
      result = false;
      return result;
    }

    const endTimeSpec =
      userInfo["completeAt"] != undefined
        ? {
            reference: "completeAt",
            offset: { type: "plus", value: { hours: 0 } },
            startOrEnd: "end",
            startEndUnit: "day",
          }
        : undefined;

    const startDate = DateTimeHelper.generateStartOrEndDateTimeByReference(
      now,
      userInfo,
      startTimeSpec
    );
    const endDate = DateTimeHelper.generateStartOrEndDateTimeByReference(
      now,
      userInfo,
      endTimeSpec
    );
    const result = DateTimeHelper.isDateStringWithinInterval(
      dateString,
      timezone,
      startDate,
      endDate
    );

    return result;
  }

  static removeFitbitUpdateDuplicate(updateList, includeStatus = false) {
    let compositeIDMap = {};

    const filteredList = updateList.filter((item) => {
      const idComponentList = [item.ownerId, item.collectionType, item.date];

      if (includeStatus) {
        idComponentList.push(item.status);
      }
      const compositeId =
        FitbitDataHelper.generateCompositeIDForFitbitUpdate(idComponentList);
      if (compositeIDMap[compositeId] == undefined) {
        compositeIDMap[compositeId] = true;
        return true;
      } else {
        // run into the same signature before
        return false;
      }
    });
    return filteredList;
  }

  static async getFitbitUpdateByStatusWithLimit(
    status = "notification",
    limit = 50,
    prioritizeSystemUpdate = true,
    favorRecent = true
  ) {
    const orderList = [
      {
        createdAt: favorRecent ? "desc" : "asc",
      },
    ];

    if (prioritizeSystemUpdate) {
      orderList.unshift({
        ownerType: "desc",
      });
    }

    const queryObj = {
      where: {
        status: status,
      },
      orderBy: orderList,
    };

    if (limit > 0) {
      queryObj["take"] = limit;
    }

    const updateList = await prisma.fitbit_update.findMany(queryObj);

    return updateList;
  }

  static async getUserFitbitUpdateDuringPeriodByIdAndOwnerType(
    fitbitId,
    startDateTime,
    endDateTime,
    ownerType = "user",
    collectionType = "activities"
  ) {
    const recordList = await prisma.fitbit_update.findMany({
      where: {
        ownerId: fitbitId,
        ownerType: ownerType,
        collectionType: collectionType,
        createdAt: {
          gte: startDateTime.toISO(),
          lte: endDateTime.toISO(),
        },
      },
    });

    return recordList;
  }
}
