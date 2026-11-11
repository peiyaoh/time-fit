import * as dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

// version 1

const taskList = await prisma.task.findMany({});
let taskInfoList = JSON.parse(JSON.stringify(taskList, replacer));

//console.log(`taskInfoList: ${JSON.stringify(taskInfoList, null, 2)}`);
//console.log(`taskInfoList[0]: ${JSON.stringify(taskInfoList[0], null, 2)}`);

let tempTaskLabelList = taskInfoList.map((taskInfo) => {
    return taskInfo.label;
});

console.log(`taskInfoList (label): ${JSON.stringify(tempTaskLabelList, null, 2)}`);

// now, filter by those with randomization

let taskWithRandomizationInfoList = taskInfoList.filter((taskInfo) => {
    return taskInfo.randomization.enabled && taskInfo.randomization.outcome[0].chance < 1;
});

//console.log(`taskWithRandomizationInfoList: ${JSON.stringify(taskWithRandomizationInfoList, null, 2)}`);
//console.log(`taskWithRandomizationInfoList[0]: ${JSON.stringify(taskWithRandomizationInfoList[0], null, 2)}`);


let excludeTaskLabelList = ["fitbit process notification"];

let filteredTaskWithRandomizationInfoList = taskWithRandomizationInfoList.filter((taskInfo) => {
    return !excludeTaskLabelList.includes(taskInfo.label);
});

tempTaskLabelList = filteredTaskWithRandomizationInfoList.map((taskInfo) => {
    return taskInfo.label;
});

console.log(`taskWithRandomizationInfoList (label): ${JSON.stringify(tempTaskLabelList, null, 2)}`);

//let selectedTaskInfo = filteredTaskWithRandomizationInfoList[0];



function calculateOutcomeProportionByTaskLog(taskLogInfoList){
    let outcomeCountMap = {};

    taskLogInfoList.forEach((taskLogInfo)=>{
        let selectedOutcome = taskLogInfo.randomizationResult.theChoice.action;

        let jsonString = JSON.stringify(selectedOutcome);

        if(outcomeCountMap[jsonString] == undefined){
            outcomeCountMap[jsonString] = 1;
        }
        else{
            outcomeCountMap[jsonString] += 1;
        }

    });

    // now, with the map, calculate the proportion of each key
    let total = 0;

    Object.keys(outcomeCountMap).forEach((outcomeString, index)=> {
        console.log(`Outcome Count: [${outcomeCountMap[outcomeString]}] for [${outcomeString}]`);
        total += outcomeCountMap[outcomeString];
    });

    console.log(`Outcome total: ${total}`);

    let outcomeProportionMap = {};
    Object.keys(outcomeCountMap).forEach((outcomeString, index)=> {
        outcomeProportionMap[outcomeString] = [outcomeCountMap[outcomeString]/total, outcomeCountMap[outcomeString], total];

        //console.log(`Outcome proportion: [${outcomeProportionMap[outcomeString]}] for [${outcomeString}]`);
    })

    return outcomeProportionMap;
}

async function calculateOutcomeProportionForTask(taskInfo){
    console.log(`calculateOutcomeProportionForTask [${taskInfo.label}]----------------------------------`);
    // now query the taskLog for this task
    const taskLogList = await prisma.taskLog.findMany({
        where: {
            taskLabel: taskInfo.label
        }
    });
    let taskLogInfoList = JSON.parse(JSON.stringify(taskLogList, replacer));

    //console.log(`taskLogInfoList ([0:2]): ${JSON.stringify(taskLogInfoList.slice(0,2), null, 2)}`);


    let outcomeProportionMap = calculateOutcomeProportionByTaskLog(taskLogInfoList);

    console.log(`----------------------------------`);
    return outcomeProportionMap;

    
}

async function calculateOutcomeProportionByWeekListForTask(taskInfo){
    console.log(`calculateOutcomeProportionByWeekListForTask [${taskInfo.label}]----------------------------------`);

    // now query the taskLog for this task
    
    const taskLogList = await prisma.taskLog.findMany({
        where: {
            taskLabel: taskInfo.label
        },
        // ensure the ordering
        orderBy: [
            {
              createdAt: "asc",
            },
        ]
    });
    let taskLogInfoList = JSON.parse(JSON.stringify(taskLogList, replacer));

    
    // Now, I need to do the weekly thing
    // remember to convert the time back to DateTime?
    // start with the first day of a week of the first element
    

    let cacahedTaskLogInfoList = JSON.parse(JSON.stringify(taskLogInfoList));

    let proportionMapList = [];

    let weekIntervalList = [];


    if(taskLogInfoList.length > 0){
        // use the first element's date as the starting point
        let startDate = DateTime.fromISO(taskLogInfoList[0].createdAt);
        let endDate = DateTime.fromISO(taskLogInfoList[taskLogInfoList.length - 1].createdAt);

        
        // now, each week
        let curWeekStart = startDate.startOf("week");
        let curWeekEnd = startDate.startOf("week").endOf("week");


        
        let unit = ["seconds"];
        let periodOutcomeProportionMap = {};

        while(cacahedTaskLogInfoList.length > 0){

            let weeklyTaskLogList = [];
            

            while(cacahedTaskLogInfoList.length > 0){
                let curDate = DateTime.fromISO(cacahedTaskLogInfoList[0].createdAt)

                if(GeneralUtility.diffDateTime(curDate, curWeekEnd, unit) >= 0){
                    weeklyTaskLogList.push(cacahedTaskLogInfoList.shift());
                }
                else{
                    break;
                }
            }

            periodOutcomeProportionMap = calculateOutcomeProportionByTaskLog(weeklyTaskLogList);
            proportionMapList.push(periodOutcomeProportionMap);
            weekIntervalList.push(Interval.fromDateTimes(curWeekStart, curWeekEnd));

            

            curWeekEnd = curWeekEnd.plus({"days": 7});            
            curWeekStart = curWeekEnd.startOf("week");
        }

        

        

    }

    

    console.log(`----------------------------------`);
    return [proportionMapList, weekIntervalList];

    
}

async function calculateOutComeProportionForTaskList(taskInfoList){
    let taskLabelResultMap = {};

    for(let i = 0; i < taskInfoList.length; i++){
        let taskInfo = taskInfoList[i];
        let outcomeProportionMap = await calculateOutcomeProportionByWeekForTask(taskInfo);
        taskLabelResultMap[taskInfo.label] = outcomeProportionMap;
    }

    return taskLabelResultMap;
}

async function calculateOutComeProportionByWeekListForTaskList(taskInfoList){
    let taskLabelResultMap = {};

    for(let i = 0; i < taskInfoList.length; i++){
        let taskInfo = taskInfoList[i];
        let result = await calculateOutcomeProportionByWeekListForTask(taskInfo);
        taskLabelResultMap[taskInfo.label] = result;
    }

    return taskLabelResultMap;
}

//let taskLabelResultMap = await calculateOutComeProportionForTaskList(taskWithRandomizationInfoList);
/*
Object.keys(taskLabelResultMap).forEach((taskLabel) => {
    console.log(`Outcome proportion for task [${taskLabel}]: [${JSON.stringify(taskLabelResultMap[taskLabel], null, 2)}]`);
});
*/



let taskLabelResultListMap = await calculateOutComeProportionByWeekListForTaskList(taskWithRandomizationInfoList);


console.log(`----------------------------`);

Object.keys(taskLabelResultListMap).forEach((taskLabel) => {
    console.log(`Outcome proportion for task [${taskLabel}]-------------------------------------------`);

    //console.log(`taskLabelResultListMap [${taskLabel}]: ${taskLabelResultListMap[taskLabel]}`);

    let result = taskLabelResultListMap[taskLabel]; 
    let proportionMapList = result[0];
    let weekIntervalList = result[1];


    //console.log(`proportionMapList [${taskLabel}]: ${proportionMapList}`);
    //console.log(`weekIntervalList [${taskLabel}]: ${weekIntervalList}`);

    // create a action index map first
    
    let actionStringIndexMap = {};
    proportionMapList.forEach((proportionMap, index) => {
        Object.keys(proportionMap).forEach((jsonString, sIndex) => {
            if(actionStringIndexMap[jsonString] == undefined){
                actionStringIndexMap[jsonString] = -1;
            }
        });
    });

    Object.keys(actionStringIndexMap).forEach((actionString, sIndex) => {
        actionStringIndexMap[actionString] = sIndex;
    });

    console.log(`\n`);
    console.log(`ActionList--------------`);

    Object.keys(actionStringIndexMap).forEach((actionString, sIndex) => {
        console.log(`action[${sIndex}]:${actionString}`);
    });
    

    console.log(`\n`);
    console.log(`Weekly Stats--------------`);


    proportionMapList.forEach((proportionMap, index) => {
        console.log(`Week [${index}][${weekIntervalList[index]}]--------------`);

        let simpifiedMap = {};

        let sortedKeys = [...Object.keys(proportionMap).sort()].reverse();

        let total = 0;

        if(sortedKeys.length > 0){
            total = proportionMap[sortedKeys[0]][2];
        }
        console.log(`Total: ${total}`);

        sortedKeys.forEach((jsonString, sIndex) => {
            simpifiedMap[`action[${actionStringIndexMap[jsonString]}]`] = proportionMap[jsonString];
            console.log(`\taction[${actionStringIndexMap[jsonString]}]: ${proportionMap[jsonString]}`);
        });
        console.log(`\n`);

        //console.log(`\t${JSON.stringify(simpifiedMap)}\n`);

    });

    console.log(`--------------`);
});



// advance
// ok, the path feature might not be supported by MongoDB
/*
let taskLogList = await await prisma.taskLog.groupBy({
    by: ['taskLabel'],
    where: {
        NOT: {
            randomizationResult: {
                path: ['chance'],
                equals: 1.0
            }
        }
    },
    
    _sum: {
      profileViews: true,
    },
    having: {
      profileViews: {
        _min: {
          gte: 10,
        },
      },
    },
    
  })
*/



//let taskWithLogInfoList = JSON.parse(JSON.stringify(taskWithLogList, replacer));


// now, start filtering 

//let testDate = DateTime.fromFormat("11/30/2022, 09:00:00 AM", "F", { zone: "America/Detroit" });

//console.log(`result[0]: ${JSON.stringify(taskWithLogInfoList[0], null, 2)}`);
