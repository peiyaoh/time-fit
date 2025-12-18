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


let referenceDateStr = "today";


let sampleCondition = {
    // Check if participant's Fitbit isn't detecting activity
    type: "hasHeartRateIntradayMinutesAboveThresholdForPersonByDateRange", // This type can only check the specified date inside the start: {}
    opposite: false, // participant has been wearing = False
    criteria: {
        // Id list: list of Qualtrics survey Ids to check
        idList: [""],

        // Whehter we want all ("and") surveys to be filled, at least one ("or") survey to be filled, or ("not any").
        // Use ("not any") for checking survey NOT filled, etc.
        idRelationship: "and",

        // check whether minutes >= wearingLowerBoundMinutes
        wearingLowerBoundMinutes: 60 * 8, // Day of checking for adherence (wakeup+1hr) will always return adherent, thus won't be counted towards Fitbit non-worn day.
        wearingDayLowerBoundCount: 1, // if specified, idRelationshi ignored; don't make it 0

        period: {
            // Start: the starting piont of the time window to consider
            // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
            // reference:
            // now: current time
            // today: start of today (00:00:00 am)
            start: {
                reference: "today",
                offset: { type: "minus", value: { days: 8 } } // check today since 00:00:00 am
            },
            // End doesn't matter for Fitbit wearing
            // Removing it means we are consider a time window up to this point
            end: {
                // reference:
                // now: current time
                // today: end of today (23:59:59 pm)
                reference: "today",
                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 hours basically means using the reference point directly
                offset: { type: "minus", value: { days: 1 } }
            }
        }
    }
};

let sampleCondition2 = {
    // Check if participant's Fitbit has detected activity two days ago - should return False (not any)
    type: "hasHeartRateIntradayMinutesAboveThresholdForPersonByDateRange",
    opposite: false,
    criteria: {
        // Id list: list of Qualtrics survey Ids to check
        idList: [""],

        // Whehter we want all ("and") surveys to be filled or at least one ("or") survey to be filled.
        // Use ("not any") for checking survey NOT filled, etc.
        idRelationship: "or",

        // check whether minutes >= wearingLowerBoundMinutes
        wearingLowerBoundMinutes: 60 * 8,

        period: { // check between: the start of the day of two days ago - today
            // Start: the starting piont of the time window to consider
            // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
            // reference:
            // now: current time
            // today: start of today (00:00:00 am)
            start: {
                reference: "today",
                offset: { type: "minus", value: { days: 5 } }
            },
            // End doesn't matter for Fitbit wearing
            // Removing it means we are consider a time window up to this point
            end: {
                // reference:
                // now: current time
                // today: end of today (23:59:59 pm)
                reference: "today",

                // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                // Plus 0 hours basically means using the reference point directly
                offset: { type: "minus", value: { days: 0 } }
            }
        }
    }
};
// checkOneConditionForUser(condition, userInfo, dateTime)


let testDate = DateTime.fromFormat("12/07/2022, 08:00:00 AM", "F", { zone: userInfo.timezone });

//let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, DateTime.utc());

let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, testDate);
let result2 = await TaskExecutor.checkOneConditionForUser(sampleCondition2, userInfo, testDate);

console.log(`checkOneConditionForUser: ${result}, ${result2}`);