import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

let userList = await prisma.users.findMany({
    where: {
        username: {
          contains: "test2",
        },
      },
});

let userInfoList = JSON.parse(JSON.stringify(userList, replacer));


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}


let sampleConditionObj = {
    // whether a task has precondition to consider.
    enabled: true,

    // Condition Relationship: deciding whether we need all conditions to be satisfied ("and"), we need one of the condition to be satisfied ("or"), or we need none of the conditions to be satisfied ("not any").
    conditionRelationship: "not any", // All conditions should return False

    // Condition list: list of conditions to be checked
    conditionList: [
        // Condition type: person, surveyFilledByThisPerson, timeInPeriod
        //See the checkOneConditionForUser() function in TaskExecutor.mjs for all the available condition type

        // Participants can be on either baseline or intervention to receive fitbit connection reminders
        {
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
                        offset: { type: "minus", value: { days: 20 } }
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
        }
    ]
};

// checkOneConditionForUser(condition, userInfo, dateTime)




//let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, DateTime.utc());

let checkResultList = [];

for (let i = 0; i < userInfoList.length; i++) {
    let userInfo = userInfoList[i];
    let testDate = DateTime.fromFormat("11/27/2022, 12:00:00 PM", "F", { zone: userInfo.timezone });
    let checkResult = await TaskExecutor.isPreConditionMetForUser(sampleConditionObj, userInfo, testDate);

    checkResultList.push(checkResult);
}

for (let i = 0; i < userInfoList.length; i++) {
    let userInfo = userInfoList[i];
    let checkResult = checkResultList[i];

    console.log(`[Test] for ${userInfo.username}: result: ${checkResult}`);

}