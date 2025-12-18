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
        username: "test1"
    }
});

userInfo = JSON.parse(JSON.stringify(userInfo, replacer));

let referenceDateStr1 = "joinAtDate";
let referenceDateStr2 = "now";


let sampleCondition =                     {
    // Soo's Comment: This condition need to be modified to look for survey NOT filled out.
    type: "messageSentDuringPeriod",
    criteria: {
        messageLabel: "investigator_19",
        period: {
            start: {                                  
                reference: "joinAtDate",
                offset: { type: "minus", value: { hours: 0} }
            },
            end: {                                  
                reference: "now",
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