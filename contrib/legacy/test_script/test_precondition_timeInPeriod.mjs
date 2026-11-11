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
let referenceDateStr2 = "joinAtDate";


let sampleCondition = {
	type: "timeInPeriod",
	criteria: {
        period: {
            start:{
			
                reference: referenceDateStr1,
                // Need to make sure that the minute and seconds do not get in the way of calculatioon
                offset: { type: "plus", value: { days: 1 } }
                
            },
            end:{
                
                reference: referenceDateStr2,
                // Need to make sure that the minute and seconds do not get in the way of calculatioon
                offset: {type: "plus", value: {days: 14}},
                inclusive: true
                
            }
        }
	}

};

// checkOneConditionForUser(condition, userInfo, dateTime)


//let testDate = DateTime.fromFormat("5/10/2022, 1:07:04 PM", "F");

//let testDate = DateTime.now();
let testDate = DateTime.fromFormat("10/24/2022, 08:00:00 AM", "F", { zone: userInfo.timezone });

//let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, DateTime.utc());



let result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, testDate);


console.log(`checkOneConditionForUser[${testDate}]: ${result}`);



testDate = DateTime.fromFormat("10/29/2022, 08:00:00 AM", "F", { zone: userInfo.timezone });
result = await TaskExecutor.checkOneConditionForUser(sampleCondition, userInfo, testDate);


console.log(`checkOneConditionForUser[${testDate}]: ${result}`);