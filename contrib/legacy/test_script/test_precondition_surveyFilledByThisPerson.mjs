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

let userInfo = await prisma.users.findFirst({
    where: {
        username: "test2"
    }
});

userInfo = JSON.parse(JSON.stringify(userInfo, replacer));

let referenceDateStr1 = "joinAtDate";
let referenceDateStr2 = "now";


let sampleCondition =                     {
    // Soo's Comment: This condition need to be modified to look for survey NOT filled out.
    type: "surveyFilledByThisPerson",
    criteria: {
        // Id list: list of Qualtrics survey Ids to check
        idList: ["SV_81aWO5sJPDhGZNA"], // baseline: SV_81aWO5sJPDhGZNA

        // Whehter we want all ("and") surveys to be filled or at least one ("or") survey to be filled.
        // Use ("not any") for checking survey NOT filled, etc.
        idRelationship: "and",
        period: {
            // Start: the starting piont of the time window to consider
            // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
            //start:{},
            // reference:
            // now: current time
            // today: start of today (00:00:00 am)
            start: {
                // reference:
                // now: current time
                // today: end of today (23:59:59 pm)                                    
                reference: "now",
                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 hours basically means using the reference point directly
                offset: { type: "minus", value: { hours: 7 * 24} }
            },

            // End: the end point of the time window to consider
            // Removing it means we are consider a time window up to this point
            end: {
                // reference:
                // now: current time
                // today: end of today (23:59:59 pm)                                    
                reference: "now",
                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 hours basically means using the reference point directly
                offset: { type: "plus", value: { hours: 0 } }
            }
        }
    }
};

// checkOneConditionForUser(condition, userInfo, dateTime)


//let testDate = DateTime.fromFormat("5/10/2022, 1:07:04 PM", "F");

let testDate = DateTime.now();

//let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, DateTime.utc());



let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, testDate);


console.log(`checkOneConditionForUser: ${result}`);