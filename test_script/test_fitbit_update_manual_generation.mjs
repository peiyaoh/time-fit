import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }s
    return value;
}


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let userList = await prisma.users.findMany({
});


async function generateManualFitbitUpdate(userInfo, datetime){
    let dateList = [];

    // now, generate a list of FitbitUpdates
    // 1. one for the (-1) date
    // 2. one for the (-7) date
    dateList.push(datetime.minus({ days: 1 }).startOf("day"));
    //dateList.push(datetime.minus({ days: 7 }).startOf("day"));


    let proxyUpdateList = [];
    let collectionType = "activities";
    let ownerType = "walktojoy";
    //console.log(`userInfo: ${JSON.stringify(userInfo, null, 2)}`);

    if (userInfo.fitbitId != undefined) {
        for(let i = 0; i < dateList.length; i++){
            let dateInfo = dateList[i];
            let proxyFitbitUpdate = {
                collectionType: collectionType,
                date: dateInfo.toFormat('yyyy-MM-dd'),
                ownerId: userInfo.fitbitId,
                ownerType: ownerType,
                subscriptionId: `${userInfo.fitbitId}-${collectionType}-${ownerType}`
            };

            let isWithinScope = await DatabaseUtility.isFitbitUpdateDateWithinAppropriateScope(proxyFitbitUpdate);
            console.log(`[isWithinScope]: ${isWithinScope}`);
            if(isWithinScope){
                proxyUpdateList.push(
                    proxyFitbitUpdate
                );
            }
        }
    }

    return proxyUpdateList;
}

let summaryList = [];

for(let i = 0; i < userList.length; i++){
    let user = userList[i];
    let startDate = DateTime.fromISO("2023-05-25T05:01:00.059Z");

    console.log(`[${user.username}][${startDate}] ----------------------------------------`);
    let resultList = await generateManualFitbitUpdate(user, startDate);
    console.log(`${user.username} - ${startDate}: resultList.length: ${resultList.length}`);
    summaryList.push({username: user.username, fitbitId: user.fitbitId, datetime: startDate, updateGenerated: resultList.length > 0});
}
console.log(`[Summary] ----------------------------------------`);
for(let i = 0; i < summaryList.length; i++){
    let sInfo = summaryList[i];

    console.log(DateTime.fromISO(sInfo.datetime).toLocaleString(DateTime.DATETIME_FULL), sInfo.username, "\t", sInfo.fitbitId, "\t", sInfo.updateGenerated);
}