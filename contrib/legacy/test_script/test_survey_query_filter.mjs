import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let surveyId = "SV_cACIS909SMXMUp8";
let startDate = DateTime.fromISO("2022-05-20T00:00:00.000Z");
let endDate = DateTime.fromISO("2022-06-27T00:00:00.000Z");

let surveyRecordList = await DatabaseUtility.findSurveyResponoseDuringPeriod(surveyId, startDate, endDate, 1);

console.log(`surveyRecordList: ${JSON.stringify(surveyRecordList, null, 2)}`);
console.log(`surveyRecordList.length: ${surveyRecordList.length}`);

