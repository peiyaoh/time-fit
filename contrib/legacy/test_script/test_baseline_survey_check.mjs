import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let userId = "test1";
let surveyId = "SV_81aWO5sJPDhGZNA";

console.log(`isBaselineSurveyCompleted for ${userId}? ${await DatabaseUtility.isSurveyCompletedByPerson(surveyId, userId)}`);

userId = "test2";
console.log(`isBaselineSurveyCompleted for ${userId}? ${await DatabaseUtility.isSurveyCompletedByPerson(surveyId, userId)}`);

userId = "test3";
console.log(`isBaselineSurveyCompleted for ${userId}? ${await DatabaseUtility.isSurveyCompletedByPerson(surveyId, userId)}`);

userId = "test4";
console.log(`isBaselineSurveyCompleted for ${userId}? ${await DatabaseUtility.isSurveyCompletedByPerson(surveyId, userId)}`);
