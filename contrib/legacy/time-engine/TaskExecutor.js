import { DateTime, Interval } from "luxon";
import DateTimeHelper from "@time-fit/helper/DateTimeHelper.js";
import BooleanHelper from "@time-fit/helper/BooleanHelper.js";
import ObjectHelper from "@time-fit/helper/ObjectHelper.js";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper.js";
import { hrtime } from "node:process";
import seedrandom from "seedrandom";

export default class TaskExecutor {
  taskSpec;
  static checkPointPreferenceTimeStringExtractionFunction;
  static actionTypeMap = {};
  static conditionTypeMap = {};

  constructor() {}

  static registerCheckPointPreferenceTimeStringExtractionFunction(func) {
    TaskExecutor.checkPointPreferenceTimeStringExtractionFunction = func;
  }

  static registerAction(name, actionClass) {
    TaskExecutor.actionTypeMap[name] = actionClass;
  }

  static registerCondition(name, conditionClass) {
    TaskExecutor.conditionTypeMap[name] = conditionClass;
  }

  static async executeTaskForUserListForDate(taskSpec, userList, date) {
    const datetime = DateTime.fromJSDate(date);



    // just for reference in other part of the class.
    this.taskSpec = taskSpec;

    let taskResultList = [];

    for (let i = 0; i < userList.length; i++) {
      let userInfo = userList[i];

      // prepare taskLog
      let taskLogObj = {};
      taskLogObj["taskLabel"] = taskSpec.label;
      taskLogObj["username"] = userInfo.username;
      taskLogObj["randomizationResult"] = {};
      taskLogObj["executionResult"] = {};
      taskLogObj["activationReasoning"] = [];
      taskLogObj["isActivated"] = true;

      // step 1: is user info ready
      // this is very much like a pre-condition, but just a system-enforce one.

      const [isUserInfoReadyResult, userInfoEvaluationRecordList] =
        await TaskExecutor.isUserInfoReadyForUser(taskSpec, userInfo);

      taskLogObj["activationReasoning"].push({
        phase: "user-info",
        result: isUserInfoReadyResult,
        recordList: userInfoEvaluationRecordList,
      });

      taskLogObj["isActivated"] = isUserInfoReadyResult;

      if (!taskLogObj["isActivated"]) {
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // step 2: group membership

      let [isGroupResult, groupEvaluationRecordList] =
        TaskExecutor.isGroupForUser(taskSpec.group, userInfo);

      taskLogObj["activationReasoning"].push({
        phase: "group",
        result: isGroupResult,
        recordList: groupEvaluationRecordList,
      });

      taskLogObj["isActivated"] = isGroupResult;

      if (!taskLogObj["isActivated"]) {
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // step 3: checkpoint (time)
      const [isCheckPointResult, checkPointEvaluationRecordList] =
        TaskExecutor.isCheckPointForUser(taskSpec.checkPoints, userInfo, date);

      taskLogObj["activationReasoning"].push({
        phase: "checkpoints",
        result: isCheckPointResult,
        // do I want to store more?
        recordList: checkPointEvaluationRecordList,
      });

      taskLogObj["isActivated"] = isCheckPointResult;

      if (!taskLogObj["isActivated"]) {
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // step 4: preconditions
      //let userNamePreConditionResultMap = {};

      let [checkResult, conditionEvaluationRecordList] =
        await TaskExecutor.isPreConditionMetForUser(
          taskSpec.preCondition,
          userInfo,
          datetime
        );

      taskLogObj["activationReasoning"].push({
        phase: "precondition",
        result: checkResult,
        // do I want to store more?
        recordList: conditionEvaluationRecordList,
      });

      if (!checkResult) {
        taskLogObj["isActivated"] = false;
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // step 5: execute action
      const chanceChoice = TaskExecutor.obtainChoiceWithRandomization(
        taskSpec.outcomes
      );
      const randomNumber = chanceChoice.randomNumber;
      const theAction = chanceChoice.theChoice.action;
      console.log(
        `executeTaskForUserListForDate (${
          userInfo.username
        }): chanceChoice: ${JSON.stringify(chanceChoice)}`
      );

      taskLogObj["randomizationResult"] = chanceChoice;

      const compositeResult = await TaskExecutor.executeActionForUser(
        theAction,
        userInfo,
        datetime
      );

      taskLogObj["isActivated"] = true;
      taskLogObj["userInfoCache"] =
        UserInfoHelper.extractUserInfoCache(userInfo);

      console.log(
        `executeTaskForUserListForDate.compositeResult: ${JSON.stringify(
          compositeResult
        )}`
      );
      taskLogObj["messageLabel"] = compositeResult["messageLabel"];
      taskLogObj["executionResult"] = compositeResult["executionResult"];

      taskResultList.push(taskLogObj);

      console.log(
        `executeTaskForUserListForDate (${
          userInfo.username
        }) taskLogObj: ${JSON.stringify(taskLogObj)}`
      );
    }

    return taskResultList;
  }

  static obtainChoiceWithRandomization(outcomesSpec) {
    if (outcomesSpec.randomizationEnabled == false) {
      return {
        randomNumber: 0,
        theChoice: outcomesSpec["outcomeList"][0],
      };
    }
    const { randomNumber, theChoice } = TaskExecutor.randomizeSelection(
      outcomesSpec.outcomeList
    );
    return { randomNumber, theChoice };
  }

  static async executeActionForUser(theAction, userInfo, datetime) {
    const record = {
      action: theAction,
      executionResult: TaskExecutor.actionTypeMap[theAction.type].execute(
        theAction,
        { userInfo, datetime }
      ),
    };

    return record;
  }

  // Inlined from packages/helper/RandomizationHelper.js: this was the only call site of
  // getRandomNumber() in the whole repo, so TaskExecutor no longer needs to depend on all
  // of @time-fit/helper for it.
  static getRandomNumber(seed) {
    const mySeed = seed == undefined ? hrtime() : seed;
    return seedrandom(mySeed)();
  }

  static randomizeSelection(choiceList) {
    let theChoice = undefined;
    const randNumber = TaskExecutor.getRandomNumber(); // Math.random();

    let allowance = randNumber;

    for (let i = 0; i < choiceList.length; i++) {
      const choice = choiceList[i];
      const cChance = choice.chance;
      allowance = allowance - cChance;
      // Example: 0.5 + 0.5
      // since 0 will be count as the first 0.5, so if allowance == 0, it should be count as the next one
      if (allowance < 0) {
        theChoice = choice;
        break;
      }
    }

    return {
      randomNumber: randNumber,
      theChoice: theChoice,
    };
  }

  static async isUserInfoReadyForUser(taskSpec, userInfo) {
    let result = true;
    let logList = [];

    if (taskSpec.ignoreTimezone == false) {
      const isTimeZoneSetResult = ObjectHelper.isPropertySet(
        userInfo,
        "timezone"
      );

      result = isTimeZoneSetResult;

      logList.push({
        target: "timezone-set",
        result: isTimeZoneSetResult,
      });
    }

    return [result, logList];
  }

  static async isPreConditionMetForUser(conditionSpec, userInfo, dateTime) {
    let result = true;

    if (
      conditionSpec.enabled == false ||
      conditionSpec.conditionList.length == 0
    ) {
      result = true;
      return [result, []];
    }

    // example
    /*
        preCondition: {
            enabled: true,
            conditionRelationship: "and",
            conditionList: [
                {
                    type: "person",
                    criteria: {
                        phase: "baseline"
                    }
                },
                {
                    type: "surveyFilledByThisPerson",
                    criteria: {
                        idList: ["SV_81aWO5sJPDhGZNA"],
                        idRelationship: "and",
                        period: {
                            //start:{},
                            end:{
                                reference: "now", 
                                offset: {type: "plus", value: {hours: 0}}
                            }
                        }
                    }
                }
            ]
        }
        */

    let evaluationReportList = [];

    let conditionEvaluationResultList = [];

    for (let i = 0; i < conditionSpec.conditionList.length; i++) {
      const condition = conditionSpec.conditionList[i];
      const [checkResult, recordInfo] =
        await TaskExecutor.checkOneConditionForUser(
          condition,
          userInfo,
          dateTime
        );
      conditionEvaluationResultList.push(checkResult);

      // this is the part that provides the structure for a condition evaluation record
      evaluationReportList.push({
        step: `precondition-${i}`,
        result: checkResult,
        condition: condition,
        record: recordInfo,
      });
    }

    result = true;
    // now, check conditionRelationship to see if it is and/or (all or one)

    result = BooleanHelper.reduceBooleanArray(
      conditionEvaluationResultList,
      conditionSpec.conditionRelationship
    );

    return [result, evaluationReportList];
  }

  static async checkOneConditionForUser(condition, userInfo, dateTime) {
    let result = true;
    let recordInfo = {};

    let conditionCompositeResult = await TaskExecutor.conditionTypeMap[condition.type].execute(condition, {
      userInfo,
      datetime,
    });

    recordInfo = conditionCompositeResult.recordInfo;
    if (condition.opposite != undefined && condition.opposite == true) {
      result = !conditionCompositeResult.result;
    } else {
      result = conditionCompositeResult.result;
    }

    return [result, recordInfo];
  }

  static isGroupForUser(groupSpec, userInfo) {
    let result = false;
    let evaluationReportList = [];

    if (groupSpec.type == "all") {
      result = true;
      evaluationReportList.push({
        step: "group-type",
        target: "all",
      });
    } else if (groupSpec.type == "list") {
      result = groupSpec.list.includes(userInfo.username);
      evaluationReportList.push({
        step: "group-list",
        target: groupSpec.list,
      });
    } else if (groupSpec.type == "group") {
      let groupMatched = false;

      const membershipList = Object.keys(groupSpec.membership);
      for (let i = 0; i < membershipList.length; i++) {
        const groupName = membershipList[i];
        if (
          groupSpec.membership[groupName].includes(
            userInfo["groupMembership"][groupName]
          )
        ) {
          groupMatched = true;
        }

        evaluationReportList.push({
          step: `group-${i}`,
          target: { key: groupName, value: groupSpec.membership[groupName] },
          source: userInfo[groupName],
        });

        if (groupMatched) {
          break;
        }
      }

      result = groupMatched;
    }

    return [result, evaluationReportList];
  }

  static isCheckPointForUser(checkPoints, userInfo, now) {
    let result = false;
    let evaluationReportList = [];

    const datetime = DateTime.fromJSDate(now);

    if (checkPoints.enabled == false) {
      result = true;
      evaluationReportList.push({
        step: "checkpoints-enabled",
        target: checkPoints.enabled,
      });
      return [result, evaluationReportList];
    }

    // now iterate through the pointList with a loop
    for (let i = 0; i < checkPoints.pointList.length; i++) {
      const checkPoint = checkPoints.pointList[i];

      let targetTime = undefined;
      let checkPointResult = false;
      const nowUTC = datetime.toUTC();
      const localTimeForUser = DateTimeHelper.getLocalDateTime(
        datetime,
        userInfo.timezone
      );

      if (checkPoint.reference.type == "spec") {

        const weekIndexList =
          checkPoint.reference.value.dateCriteria.weekIndexList;
        const localWeekIndex = localTimeForUser.weekday;

        evaluationReportList.push({
          step: `checkpoint-${i}-dayofweek`,
          target: weekIndexList,
          source: localWeekIndex,
        });

        if (!weekIndexList.includes(localWeekIndex)) {
          result = false;
          return [result, evaluationReportList];
        }

        const dateTimeRefeneceType = checkPoint.reference.value.timeStringType;

        // now check the time
        let hourMinuteString = "";

        if (dateTimeRefeneceType == "fixed") {
          hourMinuteString = checkPoint.reference.value.timeString;
        } else if (dateTimeRefeneceType == "preference") {
          const preferenceString = checkPoint.reference.value.timeString;
          hourMinuteString =
            TaskExecutor.checkPointPreferenceTimeStringExtractionFunction(
              userInfo,
              checkPoint,
              preferenceString,
              now
            );
        }

        const timeString = `${localTimeForUser.toFormat(
          "D"
        )}, ${hourMinuteString}`;
        const syncedReferenceTime = DateTime.fromFormat(timeString, "f", {
          zone: userInfo.timezone,
        });

        targetTime = syncedReferenceTime;

        // now, see if there is an offset. If so, add it.
        if (checkPoint.type == "relative") {
          if (checkPoint.offset.type == "plus") {
            targetTime = targetTime.plus(checkPoint.offset.value);
          } else if (checkPoint.offset.type == "minus") {
            targetTime = targetTime.minus(checkPoint.offset.value);
          }
        }

        targetTime = targetTime.set({ second: 0, millisecond: 0 });
        const upToMinuteNow = nowUTC.set({ second: 0, millisecond: 0 });

        const diffDateTime = DateTimeHelper.diffDateTime(
          targetTime,
          upToMinuteNow,
          ["minutes", "seconds"]
        );

        const diffObj = diffDateTime.toObject();

        if (diffObj.minutes != 0) {
          checkPointResult = false;
        } else {
          checkPointResult = true;
        }
      } else if (checkPoint.reference.type == "cron") {
        targetTime = localTimeForUser;

        // if there is offset, reverse it.
        if (checkPoint.type == "relative") {
          if (checkPoint.offset.type == "plus") {
            targetTime = targetTime.minus(checkPoint.offset.value);
          } else if (checkPoint.offset.type == "minus") {
            targetTime = targetTime.plus(checkPoint.offset.value);
          }
        }
        targetTime = targetTime.set({ second: 0, millisecond: 0 });

        // now, use target time to match the cron expression
        const cronExpressionString = checkPoint.reference.value;
        checkPointResult = DateTimeHelper.matchCronExpreesionAndDate(
          cronExpressionString,
          targetTime.toJSDate()
        );

        // wait, but this is exact match, up to the seconds, even...

        // ok, now need to check if target time matchs the cron expression, considering the timezone (local time)
        // referencce cronstrue to see if I can use its utility
        // https://github.com/bradymholt/cronstrue
      }

      evaluationReportList.push({
        step: `checkpoint-${i}-time`,
        target: targetTime,
        source: nowUTC,
      });

      if (checkPointResult == true) {
        result = true;
        break;
      }
    }

    return [result, evaluationReportList];
  }
}
