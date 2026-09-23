import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
//import { DateTime } from "luxon";
import { MyTaskList } from "../lib/MyTaskList.mjs";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

//const databaseName = "walk_to_joy";

console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID}, TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN}`);





let users = await prisma.users.findMany({
    select: {
        username: true,
        phone: true,
        preferredName: true,
        gif: true,
        salience: true,
        modification: true,
        weekdayWakeup: true,
        weekdayBed: true,
        weekendWakeup: true,
        weekendBed: true,
        timezone: true
    },
});


function replacer(key, value) {
    if (typeof value === "Date") {
      return value.toString();
    }
    return value;
}

let userList = JSON.parse(JSON.stringify(users, replacer));


// test randomization
function testRandomization(choiceList, total){
    let resultDict = {};

    for(let i = 0; i < total; i++){
        let result = TaskExecutor.randomizeSelection(choiceList);

        if(resultDict[result.value] == undefined){
            resultDict[result.value] = 1;
        }
        else{
            resultDict[result.value] = resultDict[result.value] + 1;
        }
    }

    // convert to percentage
    Object.keys(resultDict).forEach((key) => {
        resultDict[key] = resultDict[key]/total;
    });

    return resultDict;
}

let total = 1000000;
let choiceList = [
    {value: "messageLabelA", chance: 0.5},
    {value: "messageLabelB", chance: 0.5}
];
//console.log(`testRandomization(${total}) for ${JSON.stringify(choiceList)}: ${JSON.stringify(testRandomization(choiceList, total))}`);

let now = DateTime.fromISO("2023-04-05T14:00:00.000Z"); //DateTime.now();
//let taskCompositeResultList = await TaskExecutor.executeTaskForUserListForDatetime(TaskList[3], userList, now);
let taskCompositeResultList = await TaskExecutor.executeTaskForUserListForDatetime(MyTaskList[0], [GeneralUtility.systemUser], now);

console.log(`taskCompositeResultList: ${JSON.stringify(taskCompositeResultList)}`);

