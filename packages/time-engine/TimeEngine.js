import { DateTime } from "luxon";
import TaskExecutor from "./TaskExecutor.js";
import TaskHelper from "@time-fit/helper/TaskHelper.js";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper.js";
import EventHelper from "@time-fit/helper/EventHelper.js";
import TaskLogHelper from "@time-fit/helper/TaskLogHelper.js";
import TaskGeneratorHelper from "@time-fit/helper/TaskGeneratorHelper.js";

export default class TimeEngine {
  static scheduler = undefined;
  static lastDate = undefined;

  static getUserListFunction = undefined;
  static getTaskListFunction = TaskHelper.getTasksSortedByPriority;
  static taskList = [];
  static insertEventFunction = undefined;
  static insertTaskLogListFunction = undefined;
  static checkPointPreferenceTimeStringExtractionFunction = undefined;

  static systemUser = {
    username: "system-user",
    preferredName: "System User",
    phone: "",
    timezone: "America/Detroit",

    // might not matter
    phase: "intervention",
  };

  constructor() {}

  static async start() {
    // Register a function to get user list (so developers can decide whether user list needs to be retrieve every time or not)
    TimeEngine.registerGetUserListFunction(UserInfoHelper.myGetUserList);
    TimeEngine.registerCheckPointPreferenceTimeStringExtractionFunction((
      userInfo,
      checkPoint,
      preferenceTimeStringName,
      date
    ) => {
      const datetime = DateTime.fromJSDate(date);
      const localTimeForUser = GeneralUtility.getLocalTime(datetime, userInfo.timezone);
      const localWeekIndex = localTimeForUser.weekday;
    
      let referenceTimePropertyName = "";
    
      // TO DO: this part is very application specific, need to refactor this out
      if (preferenceTimeStringName == "wakeupTime") {
        if (localWeekIndex <= 5) {
          referenceTimePropertyName = "weekdayWakeup";
        } else {
          referenceTimePropertyName = "weekendWakeup";
        }
      } else if (preferenceTimeStringName == "bedTime") {
        if (localWeekIndex <= 5) {
          referenceTimePropertyName = "weekdayBed";
        } else {
          referenceTimePropertyName = "weekendBed";
        }
      } else {
        referenceTimePropertyName = checkPoint.reference.value;
      }
    
      return userInfo[referenceTimePropertyName];
    });
    
    TimeEngine.registerInsertEventFunction(EventHelper.insertEvent);
    TimeEngine.registerInsertTaskLogListFunction(TaskLogHelper.insertTaskLogList);

    if (!TimeEngine.scheduler) {
      TimeEngine.scheduler  =  setInterval(await TimeEngine.onInterval, 1 * 1000);
    }
  }

  static async stop() {
    clearInterval(TimeEngine.scheduler);
  }

  static registerAction(name, actionClass) {
    TaskExecutor.registerAction(name, actionClass);
  }

  static registerCondition(name, conditionClass) {
    TaskExecutor.conditionTypeMap[name] = conditionClass;
  }


  static registerGetUserListFunction(func){
    TimeEngine.getUserListFunction = func;
  }

  static registerOneSystemTaskWithCronAction(taskLabel, cronExpression, actionLabel){
    const newTask = TaskGeneratorHelper.generateSystemTaskWithCronAction(
      taskLabel,
          cronExpression,
      actionLabel
    );
    TimeEngine.taskList.push(newTask);
    const myGetTaskList = () => {
      return TimeEngine.taskList;
    }
    TimeEngine.registerGetTaskListFunction(myGetTaskList);
  }

  static registerOneUserTaskWithCronConditionListActionList(taskLabel, cronExpression, conditionLabelInfoList, conditionListOperator, actionlabelInfoList){
    const newTask = TaskGeneratorHelper.generaetOneUserTaskWithCronConditionListActionList(
      taskLabel,
      cronExpression,
      conditionLabelInfoList,
      conditionListOperator,
      actionlabelInfoList
    );
    TimeEngine.taskList.push(newTask);
    const myGetTaskList = () => {
      return TimeEngine.taskList;
    }
    TimeEngine.registerGetTaskListFunction(myGetTaskList);
  }

  static generateCriteriaPeriod(referenceStart, offsetTypeStart, offsetValueStart, referenceEnd, offsetTypeEnd, offsetValueEnd) {
    return TaskGeneratorHelper.generateCriteriaPeriod(
      referenceStart,
      offsetTypeStart,
      offsetValueStart,
      referenceEnd,
      offsetTypeEnd,
      offsetValueEnd
    );
  }

  static registerGetTaskListFunction(func){
    TimeEngine.getTaskListFunction = func;
  }

  // registerInsertEventFunction
  static registerInsertEventFunction(func){
    TimeEngine.insertEventFunction = func;
  }

  // registerInsertTaskLogListFunction
  static registerInsertTaskLogListFunction(func){
    TimeEngine.insertTaskLogListFunction = func;
  } 

  static registerCheckPointPreferenceTimeStringExtractionFunction(func){
    TimeEngine.checkPointPreferenceTimeStringExtractionFunction = func;
    // let TaskExecutor know about this function
    TaskExecutor.registerCheckPointPreferenceTimeStringExtractionFunction(func);
  } 


  static async onInterval(){
    const cronTime = process.hrtime();
    const now = DateTime.now().toJSDate();

    // for testing
    //await TimeEngine.processClock(now);

    
    if (TimeEngine.lastDate !== undefined) {
      const lastDateMinute = DateTime.fromJSDate(TimeEngine.lastDate)
        .startOf("minute")
        .toJSDate();
      const nowMinute = DateTime.fromJSDate(now)
        .startOf("minute")
        .toJSDate();

      if (lastDateMinute.getTime() !== nowMinute.getTime() ) {
        await TimeEngine.processClock(now);
      } else {
        // Skipping event generation as lastDate and now are the same at the minute level
      }
    }

    TimeEngine.lastDate = now;
  }

  static async executeTask(now) {

    const taskList = await TimeEngine.getTaskListFunction();
    console.log(`Executing ${taskList.length} tasks at ${now}`);
    for (let i = 0; i < taskList.length; i++) {
      let task = taskList[i];

      if (!task.enabled) {
        continue;
      }

      let userList = task.participantIndependent ? [TimeEngine.systemUser]: await TimeEngine.getUserListFunction();

      const aTaskResultList = await TaskExecutor.executeTaskForUserListForDate(
        task,
        userList,
        now
      );

      if (aTaskResultList.length > 0) {
        await TimeEngine.insertTaskLogListFunction(aTaskResultList);
      }
    }

    return;
  }

  static async processClock(now) {
    console.log(`Process clock at ${now}`);
    await TimeEngine.insertEventFunction({
      type: "clock",
      content: {
        dateString: now,
      },
    });
    const resultList = await TimeEngine.executeTask(now);
  }
}
