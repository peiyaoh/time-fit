import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const user = await prisma.users.findFirst({
    where:{
        username: "test1"
    }
})


// 2022.08.31 02:00 PM (EDT)
let dateTime = DateTime.fromJSDate(new Date(2022, 7, 31, 14, 0, 0));

let action = {
    value: true, // not sure what to make out of it yet
    chance: 1.0,
    action: {
        type: "messageLabelToResearchInvestigator", // messageLabel, or messageGroup
        messageLabel: "investigator_19", //messageLabel, only matter if the type is messageLabel
        messageGroup: "", // "nongif-m", // messageGroup, only matter if the type is messageGroup
        avoidHistory: false, // if we want to minimize the chance of sending the same message to the same user in a short window
        surveyType: "", //surveyLabel or surveyLink
        surveyLink: ""
    }
};

let result = await TaskExecutor.executeActionForUser(action, user, dateTime);

console.log(`result: ${JSON.stringify(result, null, 2)}`);
