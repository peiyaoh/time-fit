import { authOptions } from "./auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { DateTime } from "luxon";
import TaskLogHelper from "@time-fit/helper/TaskLogHelper.js";

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export const config = {
  api: {
    responseLimit: "100mb",
  },
};

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({});
    res.end();
    return;
  }
  const userName = session.user.name;

  const { function_name } = req.query;
  const { limit = 0, startDate, endDate } = req.body;

  const timeConstraint = {
    gte: DateTime.fromISO(startDate).toISO(),
    lte: DateTime.fromISO(endDate).toISO(),
  };
  let taskLogList = [];
  let queryObj = undefined;

  switch (function_name) {
    case "get":
      queryObj = {
        where: {
          createdAt: timeConstraint,
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
        ],
      };

      if (limit > 0) {
        queryObj["take"] = limit;
      }

      if (adminUsernameList.includes(userName)) {
        taskLogList = await TaskLogHelper.getTaskLogByCriteria(queryObj);
      }
      res.status(200).json({ result: taskLogList });
      return;
    case "get_investigator":
      queryObj = {
        where: {
          taskLabel: { contains: "investigator" },
          createdAt: timeConstraint,
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
        ],
      };

      if (limit > 0) {
        queryObj["take"] = limit;
      }

      if (adminUsernameList.includes(userName)) {
        taskLogList = await TaskLogHelper.getTaskLogByCriteria(queryObj);
      }
      res.status(200).json({ result: taskLogList });
      return;
    default:
      return;
  }
}
