import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let fitbitRecordList = await DatabaseUtility.getFitbitUpdateByStatusWithLimit("notification", 50, false);


console.log(`fitbitRecordList: ${JSON.stringify(fitbitRecordList, null, 2)}`);
console.log(`fitbitRecordList.length: ${fitbitRecordList.length}`);
