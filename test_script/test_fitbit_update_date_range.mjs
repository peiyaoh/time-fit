import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let startDate = DateTime.fromISO("2022-08-10T00:00:00.000+00:00");
let endDate = DateTime.fromISO("2022-08-23T00:00:00.000+00:00");

let fitbitRecordList = await DatabaseUtility.getUserFitbitUpdateDuringPeriodByIdAndOwnerType("testFitbitId", startDate, endDate, "walktojoy");


console.log(`fitbitRecordList: ${JSON.stringify(fitbitRecordList, null, 2)}`);
console.log(`fitbitRecordList.length: ${fitbitRecordList.length}`);
