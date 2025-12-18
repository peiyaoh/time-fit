import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let sampleMesssageTemplate = `Remember [survey_surveyId_last] to enhance your walking experience on your upcoming walks. [response_surveyId_last] Here is what you said you would try this week: "[response_surveyId_last]". `;

const headString = "response";

//const re = /\[[^\[\]]*\]/g;

// this works
var reString = `\\[[^\\[\\]]*\\]`;
//console.log(`reString: ${reString}`);
var re = new RegExp(reString,"g");

const found = sampleMesssageTemplate.matchAll(re);

let matchList = [...found].flat();

console.log(JSON.stringify(matchList));