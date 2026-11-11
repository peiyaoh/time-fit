import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let theAction = {
    type: "processFitbitUpdate",

    prioritizeSystemUpdate: true,

    favorRecent: true

};

let updateType = "notification";

let recentUpdateList = await DatabaseUtility.getFitbitUpdateByStatusWithLimit(updateType, 0, theAction.prioritizeSystemUpdate, theAction.favorRecent);

//console.log(`recentUpdateList: ${JSON.stringify(recentUpdateList, null, 2)}`);
console.log(`recentUpdateList.length: ${recentUpdateList.length}`);


// try to find the taskLog for the past 4 mins

let nowDateTime = DateTime.now();
let beforeDateTime = nowDateTime.minus({ minutes: 5 });


let recentTaskLogList = await DatabaseUtility.findTaskLogWithActionTypeDuringPeriod("processFitbitUpdate", beforeDateTime, nowDateTime, 0);

//console.log(`recentTaskLogList: ${JSON.stringify(recentTaskLogList, null, 2)}`);
console.log(`recentTaskLogList.length: ${recentTaskLogList.length}`);




// next, filterd by those whose 
let recentTagLogWithResultList = recentTaskLogList.filter((taskLog) => {
    return taskLog.executionResult.value.body.length > 0
});

//console.log(`recentTagLogWithResultList: ${JSON.stringify(recentTagLogWithResultList, null, 2)}`);
console.log(`recentTagLogWithResultList.length: ${recentTagLogWithResultList.length}`);


// now, extract the Fitbit ID
let recentFitbitIdWithUpdateProcessed = [];

recentTagLogWithResultList.forEach((taskLog) => {
    taskLog.executionResult.value.body.forEach((fitbitUpdateLogList) => {
        fitbitUpdateLogList.forEach((fitbitUpdateLog) => {
            let fitbitId = fitbitUpdateLog["ownerId"];
            //console.log(`fitbitId: ${fitbitId}`);
            if (!recentFitbitIdWithUpdateProcessed.includes(fitbitId)) {
                recentFitbitIdWithUpdateProcessed.push(fitbitId);
            }


        });

    });
});

console.log(`recentFitbitIdWithUpdateProcessed: ${JSON.stringify(recentFitbitIdWithUpdateProcessed, null, 2)}`);
console.log(`recentFitbitIdWithUpdateProcessed.length: ${recentFitbitIdWithUpdateProcessed.length}`);

// now, the list have all the recent updates Fitbit Ids in 4 mins

// ok, so now, filter the update list if they are about these ID
let recentUpdateWithFitbitIdNotRecentlyProcessedList = recentUpdateList.filter((updateInfo) => {
    return !recentFitbitIdWithUpdateProcessed.includes(updateInfo.ownerId);
});

//console.log(`recentUpdateWithFitbitIdNoteRecentlyProcessedList: ${JSON.stringify(recentUpdateWithFitbitIdNotRecentlyProcessedList, null, 2)}`);
console.log(`recentUpdateWithFitbitIdNoteRecentlyProcessedList.length: ${recentUpdateWithFitbitIdNotRecentlyProcessedList.length}`);

let filteredUpdateList = [];



if(recentUpdateWithFitbitIdNotRecentlyProcessedList.length > 0){
    // actually, if there are multiple, I can actually do multiple, LOL
    console.log(`There are some Fitbit Ids that are not recently processed!-------------------------------------------`);
    let updateForTheseFitbitIdList = await GeneralUtility.removeFitbitUpdateDuplicate(recentUpdateWithFitbitIdNotRecentlyProcessedList, false);

    // ok, one more step, I need to ensure that there is only one update for each Fitbit ID
    let fitbitIdInThisBatch = [];

    for(let i = 0; i < updateForTheseFitbitIdList.length; i++){
        let updateInfo = updateForTheseFitbitIdList[i];
        let fitbitId = updateInfo.ownerId;

        if(!fitbitIdInThisBatch.includes(fitbitId)){
            fitbitIdInThisBatch.push(fitbitId);
            filteredUpdateList.push(updateInfo);
        }
    }
}
else{
    // all have been recently queried, LOL
    console.log(`All Fitbit Ids that are not recently processed!-------------------------------------------`);
    // then, just pick a random update to perform

}

console.log(`filteredUpdateList: ${JSON.stringify(filteredUpdateList, null, 2)}`);
console.log(`filteredUpdateList.length: ${filteredUpdateList.length}`);

// now, for each update, retrieve accordingly

/*
let resultList =  filteredUpdateList.map((fitbitUpdate) => {
    return await 
});
*/