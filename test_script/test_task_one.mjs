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
          contains: "test2",
        },
      },
});

let userInfoList = JSON.parse(JSON.stringify(userList, replacer));

let oneUser = userInfoList[0];

// 2022.08.31 02:00 PM (EDT)
//let dateTime = DateTime.fromJSDate(new Date(2022, 7, 31, 14, 0, 0));

// let's create one task that has all the conditions

let taskList = MyTaskList.filter((taskInfo) => {
    return taskInfo.label == "intervention_morning gif";
});


for(let i = 0; i < taskList.length; i++){
    let oneTask = taskList[i];

    let startDate = DateTime.fromFormat("03/13/2023, 08:00:00 AM", "F", { zone: "America/Detroit" });
    
    // now, go through a week
    for(let j = 0; j <=7; j++){
        let curDate = startDate.plus({days: j});
        let result = await TaskExecutor.executeTaskForUserListForDatetime(oneTask, [oneUser], curDate);
        console.log(`[${curDate}] result: ${JSON.stringify(result, null, 2)}\n\n`);
    }

    
}

