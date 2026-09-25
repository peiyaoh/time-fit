import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let fitbitRecordList = await DatabaseUtility.getUserFitbitActivityDataDuringPeriodById("4SW9W9", "2022-06-06", "2022-06-12");


console.log(`fitbitRecordList: ${JSON.stringify(fitbitRecordList, null, 2)}`);
console.log(`fitbitRecordList.length: ${fitbitRecordList.length}`);


let average = await DatabaseUtility.getUserFitbitAverageDailyStepsDuringPeriodById("4SW9W9", "2022-06-06", "2022-06-12");


console.log(`average: ${average}`);


let walkList = await DatabaseUtility.getUserFitbitWalkActivityListDuringPeriodById("4SW9W9", "2022-05-23", "2022-05-29");


console.log(`walkList: ${JSON.stringify(walkList, null, 2)}`);
console.log(`walkList.length: ${walkList.length}`);



let filteredWalkList = GeneralUtility.filterFitbitWalkActivityListByDuration(walkList, 10 * 60)

console.log(`filteredWalkList: ${JSON.stringify(filteredWalkList, null, 2)}`);
console.log(`filteredWalkList.length: ${filteredWalkList.length}`);




