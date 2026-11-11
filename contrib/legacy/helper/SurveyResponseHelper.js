import { getPrismaClient } from "@time-fit/database/prisma.js";
import { DateTime } from "luxon";
export default class SurveyResponseHelper {
  constructor() {}

  static async insertSurveyResponseList(surveyResponseList) {
    const prisma = getPrismaClient();
    if (surveyResponseList.length == 0) {
      return { count: 0 };
    }
    return await prisma.response.createMany({
      data: surveyResponseList,
    });
  }

  static async findSurveyResponseDuringPeriod(
    surveyId,
    startDate,
    endDate,
    sort = "desc",
    limit = -1
  ) {
    let queryObj = {
      where: {
        surveyId: surveyId,
        dateTime: {
          gte: startDate.toISO(),
          lte: endDate.toISO(),
        },
      },
      orderBy: [
        {
          dateTime: sort,
        },
      ],
    };

    if (limit >= 0) {
      queryObj["take"] = limit;
    }

    const prisma = getPrismaClient();
    const responseList = await prisma.response.findMany(queryObj);

    return responseList;
  }

  static async findSurveyResponsesByCriteria(criteria) {
    const prisma = getPrismaClient();
    const responseList = await prisma.response.findMany(criteria);
    return responseList;
  }

  static async isSurveyCompletedByPerson(surveyId, personId) {
    const startDate = DateTime.utc(2000);
    const endDate = DateTime.utc();

    const responseList =
      await SurveyResponseHelper.findSurveyResponseDuringPeriod(
        surveyId,
        startDate,
        endDate,
        "asc",
        1
      );

    const filteredResponseList = responseList.filter((responseInfo) => {
      return responseInfo.participantId == personId;
    });

    return filteredResponseList.length > 0;
  }

  static async getSurveyResponseFromPersonDuringPeriod(
    surveyId,
    participantId,
    startDate,
    endDate,
    limit = 0
  ) {

    let queryObj = {
      where: {
        surveyId: surveyId,
        participantId: participantId,
        dateTime: {
          gte: startDate.toISO(),
          lte: endDate.toISO(),
        },
      },
      orderBy: [
        {
          dateTime: "desc",
        },
      ],
    };

    if (limit > 0) {
      queryObj["take"] = limit;
    }

    const responseList = await SurveyResponseHelper.findSurveyResponsesByCriteria(queryObj);

    return responseList;
  }
}
