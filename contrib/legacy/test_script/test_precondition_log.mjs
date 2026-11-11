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

let userList = await prisma.users.findMany({
    where: {
        username: {
          contains: "test1",
        },
      },
});

let userInfoList = JSON.parse(JSON.stringify(userList, replacer));

let referenceDateStr = "today";

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
            // type: "hasFitbitUpdateForPersonByDateRange" checks for fitbit update for the specified date
            // Check if participant's Fitbit IS updating/syncing - should return False
            type: "hasFitbitUpdateForPersonByDateRange",
            opposite: false,
            criteria: {
                // Id list: list of Qualtrics survey Ids to check
                idList: [""],

                // Whehter we want all ("and") surveys to be filled or at least one ("or") survey to be filled.
                // Use ("not any") for checking survey NOT filled, etc.
                idRelationship: "and",
                period: {
                    // Start: the starting piont of the time window to consider
                    // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
                    // reference:
                    // now: current time
                    // today: start of today (00:00:00 am)
                    start: {
                        reference: "today",
                        offset: { type: "minus", value: { days: 2 } } // There was an update detected since 2 days ago - must return False
                    },
                    // End: the end point of the time window to consider
                    // Removing it means we are consider a time window up to this point
                    end: {
                        // reference:
                        // now: current time
                        // today: end of today (23:59:59 pm)
                        reference: "today",

                        // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                        // Plus 0 hours basically means using the reference point directly
                        offset: { type: "plus", value: { hours: 0 } }
                    }
                }
            }
        },
        {
            // type: "hasFitbitUpdateForPersonByDateRange" checks for fitbit update for the specified date
            // Check if participant's Fitbit isn't updating/syncing - should return True for reminder to stop at day 5.
            type: "hasFitbitUpdateForPersonByDateRange",
            opposite: true,
            criteria: {
                // Id list: list of Qualtrics survey Ids to check
                idList: [""],

                // Whehter we want all ("and") surveys to be filled or at least one ("or") survey to be filled.
                // Use ("not any") for checking survey NOT filled, etc.
                idRelationship: "and",
                period: {
                    // Start: the starting piont of the time window to consider
                    // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
                    // reference:
                    // now: current time
                    // today: start of today (00:00:00 am)
                    start: {
                        reference: "today",
                        offset: { type: "minus", value: { days: 5 } } // There wasn't an update detected since 5 days ago
                    },
                    // End: the end point of the time window to consider
                    // Removing it means we are consider a time window up to this point
                    end: {
                        // reference:
                        // now: current time
                        // today: end of today (23:59:59 pm)
                        reference: "today",

                        // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                        // Plus 0 hours basically means using the reference point directly
                        offset: { type: "plus", value: { hours: 0 } }
                    }
                }
            }
        },
    ]
};


let checkResultList = [];

for (let i = 0; i < userInfoList.length; i++) {
    let userInfo = userInfoList[i];
    console.log(`User: ${userInfo.username}`);
    let testDate = DateTime.fromFormat("11/27/2022, 12:00:00 PM", "F", { zone: userInfo.timezone });
    let [checkResult, conditionEvaluationRecordList] = await TaskExecutor.isPreConditionMetForUser(sampleConditionObj, userInfo, testDate);

    checkResultList.push([checkResult, conditionEvaluationRecordList]);
}

for (let i = 0; i < checkResultList.length; i++) {
    let [checkResult, conditionEvaluationRecordList] = checkResultList[i];

    console.log(`[Test Record]: ${checkResult} -  ${JSON.stringify(conditionEvaluationRecordList, null, 2)}`);

}
