import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
//import { DateTime } from "luxon";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let nowDate = DateTime.now();
let startDate = nowDate.minus({weeks: 2}).startOf("day");
let daysConstraint = {
  gte: startDate.toISO(),
  lte: nowDate.toISO()
};


let sampleList = await prisma.taskLog.findMany({
    take: 100000,
    /*
    where:{
        username: "test2",
        taskLabel: "intervention_morning gif",
        createdAt: daysConstraint
    },
    */
    
    orderBy: {
        createdAt: 'desc',
    },
    
});

let twilioList = sampleList.filter((taskLog) =>{
    return taskLog.executionResult["type"] == "twilio"; // && taskLog.executionResult["value"]["errorCode"] != null;
});

console.log(`twilioList: ${JSON.stringify(twilioList, null, 2)}`);