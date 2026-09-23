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
          contains: "participant",
        },
      },
});

let userInfoList = JSON.parse(JSON.stringify(userList, replacer));

/*
let userInfo = await prisma.users.findFirst({
    where: {
        username: "test1"
    }
});

userInfo = JSON.parse(JSON.stringify(userInfo, replacer));
*/

let referenceDateStr = "today";

let sampleConditionObj = {
    // whether a task has precondition to consider.
    enabled: true,

    // Condition Relationship: deciding whether we need all conditions to be satisfied ("and"), or we need one of the condition to be satisfied ("or").
    conditionRelationship: "and",

    // Condition list: list of conditions to be checked
    conditionList: [
        // Condition type: person, surveyFilledByThisPerson, timeInPeriod
        //See the checkOneConditionForUser() function in TaskExecutor.mjs for all the available condition type

        {
            // person -> check a participant's property
            // For instance, the following example check whehter a person is in its baseline phase (with the "phase" property set to "baseline")
            type: "person",
            // opposite: true, //Use opposite for conditions that are not to be met                        
            criteria: {
                phase: "baseline"
            }
        },
        {
            // surveyFilledByThisPerson -> check whether a survey response is received within a time window
            type: "surveyFilledByThisPerson",
            // opposite: true, //Use opposite for conditions that are not to be met                        
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
        },
        {
            type: "hasHeartRateIntradayMinutesAboveThresholdForPersonByDateRange", // This type can only check the specified date inside the start: {}
            opposite: false, // participant did adhere to wearing fitbit for +8 hours for 3 days
            criteria: {
                idList: [""],

                // Whehter we want all ("and") surveys to be filled or at least one ("or") survey to be filled.
                // Use ("not any") for checking survey NOT filled, etc.
                idRelationship: "and", //used for hasHeartRateIntradayMinutesAboveThresholdForPersonByDateRange

                // check whether minutes >= wearingLowerBoundMinutes
                wearingLowerBoundMinutes: 60 * 8,
                wearingDayLowerBoundCount: 3, // if specified, idRelationshi ignored; don't make it 0

                period: {
                    // Start: the starting piont of the time window to consider
                    // Removing it means we are consider a time window starting from the very beginning of time (year 200 for impelementation)
                    start: {
                        reference: "joinAtDate",
                        offset: { type: "minus", value: { days: 0 } } // checks for wearing adherence the last 7 days
                    },
                    // reference:
                    // now: current time
                    // today: start of today (00:00:00 am)

                    // End doesn't matter for Fitbit wearing
                    // Removing it means we are consider a time window up to this point
                    // end:{
                    //     // reference:
                    //     // now: current time
                    //     // today: end of today (23:59:59 pm)
                    //     reference: "today",

                    //     // offset, the time that will be added ("plus") or substracted ("minus") from the reference
                    //     // Plus 0 hours basically means using the reference point directly
                    //     offset: {type: "minus", value: {days: 6}}
                    // }
                }
            }
        },
    ]
};

// checkOneConditionForUser(condition, userInfo, dateTime)




//let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, DateTime.utc());

let checkResultList = [];

for (let i = 0; i < userInfoList.length; i++) {
    let userInfo = userInfoList[i];
    let checkResult = undefined;
    console.log(`[${userInfo["username"]}]------------------------------------------`);
    
    if (userInfo["username"] != "system-user" && (userInfo["joinAt"] == null || userInfo["phase"] == "complete")) {
        console.log(`Skpping ${userInfo["username"]}, joinAt: ${userInfo["joinAt"]}, phase: ${userInfo["phase"]}`);
        checkResult = [false, []];
        checkResultList.push(checkResult);
        continue;
    }
    let testDate = DateTime.fromFormat("05/30/2023, 12:00:00 PM", "F", { zone: userInfo.timezone });
    checkResult = await TaskExecutor.isPreConditionMetForUser(sampleConditionObj, userInfo, testDate);
    checkResultList.push(checkResult);
    
}

for (let i = 0; i < userInfoList.length; i++) {
    let userInfo = userInfoList[i];
    let checkResult = checkResultList[i];

    console.log(`[Test] for ${userInfo.username}: result: ${JSON.stringify(checkResult)}`);

}