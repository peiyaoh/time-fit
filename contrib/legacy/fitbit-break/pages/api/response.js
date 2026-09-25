import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import SurveyResponseHelper from "@time-fit/helper/SurveyResponseHelper";

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({});
    res.end();
    return;
  }

  const { function_name } = req.query;

  const username = session.user.name;

  switch (function_name) {
    case "is_survey_completed":
      const { surveyId } = req.body;
      let result = await SurveyResponseHelper.isSurveyCompletedByPerson(
        surveyId,
        username
      );
      res.status(200).json({ result: result });
      return;
    case "get":
      let itemList = [];

      const queryObj = {
        orderBy: [
          {
            updatedAt: "desc",
          },
        ],
      };
      if (adminUsernameList.includes(username)) {
        itemList = await SurveyResponseHelper.findSurveyResponsesByCriteria(
          queryObj
        );
      }
      res.status(200).json({ result: itemList });
      return;
    default:
      return;
  }
}
