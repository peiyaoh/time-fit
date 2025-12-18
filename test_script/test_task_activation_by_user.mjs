import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
import { MyTaskList } from "../lib/MyTaskList.mjs";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

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

let oneUser = userInfoList[0];

// 2022.08.31 02:00 PM (EDT)
//let dateTime = DateTime.fromJSDate(new Date(2022, 7, 31, 14, 0, 0));

// let's create one task that has all the conditions

let taskList = MyTaskList.filter((taskInfo) => {
    return taskInfo.label == "planned walk reminders";
});

let resultList = [];

for (let i = 0; i < taskList.length; i++) {
    let oneTask = taskList[i];

    //let startDate = DateTime.fromFormat("03/13/2023, 08:00:00 AM", "F", { zone: "America/Detroit" });

    // 2023-03-22T00:01:00.248Z +4
    // how about using user's preference to decide the time


    //let startDate = DateTime.fromISO(`2023-06-13T04:00:00.059Z`);

    let localDate = DateTime.fromISO(`2023-06-13T12:00:00.000Z`);

    // now, go through a few minutes


    // let result = await TaskExecutor.executeTaskForUserListForDatetime(oneTask, [oneUser], curDate);

    let referenceTimePropertyName = "weekdayWakeup";

    for (let k = 0; k < userInfoList.length; k++) {
        let userInfo = userInfoList[k];

        let isTimeZoneSetResult = GeneralUtility.isTimezoneSet(userInfo);
        console.log(`[${userInfo.username}] isTimeZoneSetResult: ${isTimeZoneSetResult}\n\n`);
        if (!isTimeZoneSetResult) {
            console.log(`Timezone not set: skip this participant: ${userInfo.username}`);
            //resultList.push({ date: curDate, username: userInfo.username, result: isTimeZoneSetResult });
            continue;
        }

        let [isGroupResult, groupEvaluationRecordList] = TaskExecutor.isGroupForUser(oneTask.group, userInfo);
        console.log(`[${userInfo.username}] isGroupResult: ${isGroupResult}\n\n`);


        let timeString = `${localDate.toFormat("D")}, ${DateTime.fromISO(userInfo[referenceTimePropertyName], { zone: userInfo.timezone != undefined ? userInfo.timezone : "America/Detroit" }).toFormat("t")}`;

        // new
        let startDate = DateTime.fromFormat(timeString, "f", { zone: userInfo.timezone }).plus({ hours: 4 });


        console.log(`[${userInfo.username}] testing, starting at ${startDate.minus({ minutes: 1 })} in zone: ${userInfo.timezone}-----------------------------`);

        for (let j = 0; j <= 3; j++) {
            let curDate = startDate.minus({ minutes: 1 }).plus({ minutes: j });
            console.log(`[${curDate}] --------------------------------------------------------------\n\n`);






            let [isCheckPointResult, checkPointEvaluationRecordList] = TaskExecutor.isCheckPointForUser(oneTask.checkPoint, userInfo, curDate);
            console.log(`[${curDate}] isCheckPointResult: ${isCheckPointResult}\n\n`);
            let [isPreconditionResult, conditionEvaluationRecordList] = await TaskExecutor.isPreConditionMetForUser(oneTask.preCondition, userInfo, curDate);
            console.log(`[${curDate}] isPreConditionMetForUser: ${isPreconditionResult}\n\n`);

            console.log(`------------------\n\n`);

            console.log(`[${curDate}] isTimeZoneSetResult: ${isTimeZoneSetResult}\n\n`);
            console.log(`[${curDate}] isGroupResult: ${isGroupResult}\n\n`);
            console.log(`[${curDate}] isCheckPointResult: ${isCheckPointResult}\n\n`);
            console.log(`[${curDate}] isPreConditionMetForUser: ${isPreconditionResult}\n\n`);

            console.log(`--------------------------------------------------------------\n\n`);

            resultList.push({ date: curDate, username: userInfo.username, result: isTimeZoneSetResult && isGroupResult && isCheckPointResult && isPreconditionResult });

        }
    }
}




console.log(`\n\n--------------------------------------------------------------\n\n`);

for (let i = 0; i < resultList.length; i++) {
    let resultInfo = resultList[i];
    console.log(`[${resultInfo.date}], ${resultInfo.username} - result: ${resultInfo.result}`);
}
