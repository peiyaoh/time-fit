import { DateTime, Interval } from "luxon";
import DateTimeHelper from "@time-fit/helper/DateTimeHelper.js";

export default class TaskExecutor {
  constructor() {}

  static async executeTaskForUserListForDatetime(taskSpec, userList, datetime) {
    console.log(
      `executeTaskForUserListForDatetime taskSpec.enabled: ${taskSpec.enabled} for ${taskSpec.label}`
    );

    this.taskSpec = taskSpec;
    let taskResultList = [];

    if (taskSpec.enabled == false) {
      return taskResultList;
    }

    console.log(`executeTask: userList.length: ${userList.length}`);
    console.log(`executeTask: ignoreTimezone: ${taskSpec.ignoreTimezone}`);

    for (let i = 0; i < userList.length; i++) {
      let userInfo = userList[i];

      if (
        userInfo["username"] != "system-user" &&
        (userInfo["joinAt"] == null || userInfo["phase"] == "complete")
      ) {
        continue;
      }

      let taskLogObj = {
        taskLabel: taskSpec.label,
        username: userInfo.username,
        randomizationResult: {},
        messageLabel: "",
        executionResult: {},
        activationReasoning: [],
      };

      // Step 1: Check timezone if required
      if (taskSpec.ignoreTimezone == false) {
        let isTimeZoneSetResult = this.isTimezoneSet(userInfo);
        console.log(
          `isTimezoneSet: user[${userInfo.username}]: ${isTimeZoneSetResult}`
        );

        taskLogObj["activationReasoning"].push({
          phase: "timezone-set",
          result: isTimeZoneSetResult,
          recordList: [],
        });
        
        if (!isTimeZoneSetResult) {
          taskLogObj["isActivated"] = false;
          if (taskSpec["preActivationLogging"]) {
            taskResultList.push(taskLogObj);
          }
          continue;
        }
      }

      // Step 2: Check group membership
      let [isGroupResult, groupEvaluationRecordList] =
        this.isGroupForUser(taskSpec.group, userInfo);
      console.log(
        `isGroupForUser: user[${userInfo.username}]: ${isGroupResult}`
      );

      taskLogObj["activationReasoning"].push({
        phase: "group",
        result: isGroupResult,
        recordList: groupEvaluationRecordList,
      });

      if (!isGroupResult) {
        taskLogObj["isActivated"] = false;
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // Step 3: Check checkpoint (time)
      let [isCheckPointResult, checkPointEvaluationRecordList] =
        this.isCheckPointForUser(
          taskSpec.checkPoint,
          userInfo,
          datetime
        );
      console.log(
        `isCheckPointResult: user[${userInfo.username}]: ${isCheckPointResult}`
      );

      taskLogObj["activationReasoning"].push({
        phase: "checkpoint",
        result: isCheckPointResult,
        recordList: checkPointEvaluationRecordList,
      });

      if (!isCheckPointResult) {
        taskLogObj["isActivated"] = false;
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // Step 4: Check preconditions
      let [checkResult, conditionEvaluationRecordList] =
        await this.isPreConditionMetForUser(
          taskSpec.preCondition,
          userInfo,
          datetime
        );

      console.log(
        `isPreConditionMetForUser [${userInfo.username}]: ${checkResult} - ${conditionEvaluationRecordList}`
      );

      taskLogObj["activationReasoning"].push({
        phase: "precondition",
        result: checkResult,
        recordList: conditionEvaluationRecordList,
      });

      if (!checkResult) {
        taskLogObj["isActivated"] = false;
        if (taskSpec["preActivationLogging"]) {
          taskResultList.push(taskLogObj);
        }
        continue;
      }

      // Step 5: Execute action
      let chanceChoice = this.obtainChoiceWithRandomization(
        taskSpec.randomization
      );
      let randomNumber = chanceChoice.randomNumber;
      let theAction = chanceChoice.theChoice.action;

      taskLogObj["randomizationResult"] = chanceChoice;

      let compositeResult = await this.executeActionForUser(
        theAction,
        userInfo,
        datetime
      );

      taskLogObj["isActivated"] = true;
      taskLogObj["userInfoCache"] = this.extractUserInfoCache(userInfo);
      taskLogObj["messageLabel"] = compositeResult["messageLabel"];
      taskLogObj["executionResult"] = compositeResult["executionResult"];

      taskResultList.push(taskLogObj);
    }

    return taskResultList;
  }

  static obtainChoiceWithRandomization(randomizationSpec) {
    if (randomizationSpec.enabled == false) {
      return {
        randomNumber: 0,
        theChoice: randomizationSpec["outcome"][0],
      };
    }

    const { randomNumber, theChoice } = this.randomizeSelection(
      randomizationSpec.outcome
    );

    return { randomNumber, theChoice };
  }

  static async executeActionForUser(theAction, userInfo, datetime) {
    let record = {
      messageLabel: "",
      executionResult: null,
    };

    record.action = theAction;

    console.log(`theAction.type: ${theAction.type}`);

    switch (theAction.type) {
      case "noAction":
        record.executionResult = {
          type: "no-action",
          value: {
            status: "success",
            errorMessage: "",
            body: {},
          },
        };
        break;
      default:
        // Default to no action for unknown types
        record.executionResult = {
          type: "no-action",
          value: {
            status: "success",
            errorMessage: "",
            body: {},
          },
        };
        break;
    }

    return record;
  }

  static randomizeSelection(choiceList) {
    let theChoice = undefined;
    let randNumber = Math.random();
    let allowance = randNumber;

    for (let i = 0; i < choiceList.length; i++) {
      let choice = choiceList[i];
      let cChance = choice.chance;
      allowance = allowance - cChance;

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

  static async isPreConditionMetForUser(conditionSpec, userInfo, dateTime) {
    console.log(
      `${this.name} isPreConditionMetForUser[${
        this.taskSpec != undefined
          ? this.taskSpec.label
          : "[testing] no taskSpec"
      }] for ${userInfo.username}`
    );

    let result = true;

    if (
      conditionSpec.enabled == false ||
      conditionSpec.conditionList.length == 0
    ) {
      return [result, []];
    }

    let conditionEvaluationRecordList = [];

    for (let i = 0; i < conditionSpec.conditionList.length; i++) {
      let condition = conditionSpec.conditionList[i];
      let checkResult = await this.checkOneConditionForUser(condition, userInfo, dateTime);
      
      conditionEvaluationRecordList.push({
        condition: condition,
        result: checkResult,
      });

      if (conditionSpec.conditionRelationship === "and" && !checkResult) {
        result = false;
        break;
      } else if (conditionSpec.conditionRelationship === "or" && checkResult) {
        result = true;
        break;
      } else if (conditionSpec.conditionRelationship === "not any" && checkResult) {
        result = false;
        break;
      }
    }

    return [result, conditionEvaluationRecordList];
  }

  static async checkOneConditionForUser(condition, userInfo, dateTime) {
    switch (condition.type) {
      case "person":
        return this.checkPersonCondition(condition.criteria, userInfo);
      default:
        return true;
    }
  }

  static checkPersonCondition(criteria, userInfo) {
    let result = true;
    
    for (let [key, value] of Object.entries(criteria)) {
      if (userInfo[key] !== value) {
        result = false;
        break;
      }
    }
    
    return result;
  }

  static isTimezoneSet(userInfo) {
    if (userInfo == null) {
      return false;
    }
    return userInfo.timezone != undefined;
  }

  static isGroupForUser(groupSpec, userInfo) {
    let recordList = [];
    let result = true;

    switch (groupSpec.type) {
      case "all":
        result = true;
        break;
      case "group":
        result = this.checkGroupMembership(groupSpec.membership, userInfo);
        recordList = [groupSpec.membership];
        break;
      case "list":
        result = groupSpec.list.includes(userInfo.username);
        recordList = [groupSpec.list];
        break;
      default:
        result = true;
        break;
    }

    return [result, recordList];
  }

  static checkGroupMembership(membership, userInfo) {
    for (let [key, value] of Object.entries(membership)) {
      if (value.length > 0 && (!userInfo[key] || !value.includes(userInfo[key]))) {
        return false;
      }
    }
    return true;
  }

  static isCheckPointForUser(checkPointSpec, userInfo, datetime) {
    let recordList = [];
    let result = true;

    // This is a simplified implementation
    // In a real implementation, you would check the actual checkpoint logic
    // based on the checkPointSpec configuration
    
    return [result, recordList];
  }

  static extractUserInfoCache(userInfo) {
    const { id, password, hash, accessToken, refreshToken, ...rest } = userInfo;
    return { ...rest };
  }
}
