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

let condition = {
    type: "hasHeartRateIntradayMinutesAboveThresholdForPersonByDate",

    // if we want the opposite outcome -> basically negate the outcome: true -> false, false -> true
    opposite: true,

    criteria: {
        // check whether minutes >= wearingLowerBoundMinutes
        wearingLowerBoundMinutes: 60 * 7,
        period: {
            // Start: the date, 2022-08-31
            start:{
                // reference: currently only support "today" as the basis
                reference: "today", 

                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 days basically means using the reference point directly
                offset: {type: "minus", value: {days: 0}}
            },

            // not using end date
            /*
            end:{
                // reference: currently only support "today" as the basis
                reference: "today", 

                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 days basically means using the reference point directly
                offset: {type: "minus", value: {days: 0}}
            }
            */
        }
    }
};

let result = await TaskExecutor.checkOneConditionForUser(condition, user, dateTime);

console.log(`result: ${JSON.stringify(result, null, 2)}`);
