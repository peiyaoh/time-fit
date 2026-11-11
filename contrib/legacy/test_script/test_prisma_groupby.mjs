import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import {DateTime} from "luxon";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

let taskLogGroupByList = await prisma.taskLog.groupBy({
    by: ["username", "messageLabel"],
    _count: {
      messageLabel: true,
    },
    orderBy: [
      {
        username: "asc",
      },
    ],
    //take: queryLimit
});

let taskLogGroupByInfoList = JSON.parse(JSON.stringify(taskLogGroupByList, replacer));

console.log(`prisma.taskLog.groupBy: ${JSON.stringify(taskLogGroupByInfoList, null, 2)}`);