export default class TaskLogDisplayHelper {
  constructor() {}
  static convertRandomizationResultToString(rResult) {
    let result = "";

    switch (rResult.type) {
      case "noAction":
        result = `noAction`;
        break;
      default:
        if (rResult.theChoice != undefined) {
          result = `chance: ${rResult.theChoice.chance}, random: ${rResult.randomNumber}`;
        } else {
          result = "";
        }
        break;
    }

    return result;
  }

  static extractOutcomeToString(theChoice) {
    let result = "";
    const excludeNameList = ["type"];

    if (theChoice != undefined) {
      result = `[${theChoice.chance}]${theChoice.action.type} -`;
      Object.keys(theChoice.action).forEach((propertyName) => {
        if (!excludeNameList.includes(propertyName)) {
          if (theChoice.action[propertyName] == undefined) {
          } else if (typeof theChoice.action[propertyName] != "string") {
            result =
              result + ` ${propertyName}:${theChoice.action[propertyName]}`;
          } else if (
            typeof theChoice.action[propertyName] == "string" &&
            theChoice.action[propertyName].length > 0
          ) {
            result =
              result + ` ${propertyName}:${theChoice.action[propertyName]}`;
          }
        }
      });
    }

    return result;
  }

  static convertExecutionResultToString(eResult) {
    let result = "";
    switch (eResult.type) {
      case "noAction":
        result = `noAction`;
        break;
      default:
        if (eResult.type != undefined && eResult.value != undefined) {
          result = `type: ${eResult.type}, status: ${eResult.value.status}, errorMessage: ${eResult.value.errorMessage}`;
        }
        break;
    }

    return result;
  }

  static extractUserGroupMembershipToString(userInfo) {
    if (userInfo == null) {
      return "";
    }

    if (userInfo.groupMembership == undefined) {
      return "";
    }

    let resultList = [];

    Object.keys(userInfo.groupMembership).forEach((groupMembershipName) => {
      const memberhsipString = `${groupMembershipName}: ${userInfo.groupMembership[groupMembershipName]}`;
      resultList.push(memberhsipString);
    });

    let result = resultList.join(", ");
    return result;
  }
}
