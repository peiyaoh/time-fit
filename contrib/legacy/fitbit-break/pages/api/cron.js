import prisma from "@time-fit/database/prisma.js";
import { DateTime } from "luxon";
import TaskExecutor from "@time-fit/time-engine/TaskExecutor.js";
import GeneralUtility from "@time-fit/app-utils/GeneralUtility.js";
import DatabaseUtility from "@time-fit/database/DatabaseUtility.js";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

function getLocalTime(datetime, timezone) {
    return datetime.setZone(timezone);
}

function getWeekdayOrWeekend(datetime) {
    console.log(`getWeekdayOrWeekend: ${datetime.weekday}`);
    if (datetime.weekday < 6) {
        return "weekday";
    }
    else {
        return "weekend";
    }
}

function exclude(item, keyList) {
    for (let key of keyList) {
      delete item[key]
    }
    return item
  }

async function executeTask(now) {
    let users = await prisma.users.findMany();

    // old
    /*
    let userList = await prisma.users.findMany({
        select: {
            username: true,
            preferredName: true,
            phone: true,
            timezone: true,
            phase: true,
            joinAt: true,
            activateAt: true,
            fitbitReminderTurnOff: true,
            saveWalkToJoyToContacts: true,
            gif: true,
            salience: true,
            modification: true,
            weekdayWakeup: true,
            weekdayBed: true,
            weekendWakeup: true,
            weekendBed: true,
            
        },
    });
    */

    users = users.map((userInfo) => {
        return exclude(userInfo, ["password", "hash", "accessToken", "refreshToken"]);
    });


    let userList = JSON.parse(JSON.stringify(users, replacer));

    let tasks = await prisma.task.findMany({
        where: { enabled: true},
        orderBy: [
            {
              priority: "asc",
            },
        ],
    });

    let taskList = JSON.parse(JSON.stringify(tasks, replacer));

    let taskCompositeResultList = [];


    // version 2: try inserting results for each task once it's ready
    for(let i = 0; i < taskList.length; i++){
        let task = taskList[i];

        let insertResult = undefined;

        let aTaskResultList = [];

        if( task.participantIndependent == false){
            aTaskResultList = await TaskExecutor.executeTaskForUserListForDatetime(task, userList, now);
        }
        else{
            aTaskResultList = await TaskExecutor.executeTaskForUserListForDatetime(task, [GeneralUtility.systemUser], now);
        }

        if(aTaskResultList.length > 0){
            insertResult = await prisma.taskLog.createMany({
                data: aTaskResultList
            });
        }
    }

    return;

    

}


export default async function handler(req, res) {
    const { function_name, date } = req.query;

    let ip = GeneralUtility.getIPFromRequest(req);
    console.log(`cron.handler ip: ${ip}, function_name: ${function_name}`);

    console.log(`cron.handler isRequestFromLocalhost: ${GeneralUtility.isRequestFromLocalhost(req)}`);

    // version 1
    //let now = DateTime.now(); //.plus({day: 2}); // DateTime.now();

    // version 2: use the date parameter from the cron job
    const now = DateTime.fromISO(date);

    // insert clock event to event colleection
    await DatabaseUtility.insertEvent({
        type: "clock",
        content: {
            dateString: date
        }
    });


    switch (function_name) {
        case "execute_task":
            let resultList = executeTask(now);
            res.status(200).json({ result: "success" });
            break;
        case "create_fitbit_subscription":
            break;
        default:
            break;
    }

    res.status(200).end();
}
