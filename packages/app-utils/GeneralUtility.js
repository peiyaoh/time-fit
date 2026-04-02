import { DateTime, Interval } from "luxon";
import voca from 'voca';
import { getDiff } from 'json-difference';
import DateTimeHelper from "@time-fit/helper/DateTimeHelper.js";

export default class GeneralUtility {
  constructor() {}

  static FITBIT_INTRADAY_DATA_TYPE_ACTIVITY_SUMMARY = "activity-summary";
  static FITBIT_INTRADAY_DATA_TYPE_HEART = "activity-heart";
  static FITBIT_INTRADAY_DATA_TYPE_STEP = "activity-step";

  static unitList = ["year", "month", "day", "hour", "minute", "second", "millisecond"];

  static systemUser = {
    username: "system-user",
    preferredName: "System User",
    phone: "",
    timezone: "America/Detroit",
    phase: "intervention",
  };

  static usTimeZoneOffetInfoList = [
    { name: 'America/New_York', offset: -240, offsetLabel: 'GMT -4' },
    { name: 'America/Chicago', offset: -300, offsetLabel: 'GMT -5' },
    { name: 'America/Denver', offset: -360, offsetLabel: 'GMT -6' },
    { name: 'America/Los_Angeles', offset: -420, offsetLabel: 'GMT -7' },
    { name: 'America/Anchorage', offset: -480, offsetLabel: 'GMT -8' },
    { name: 'America/Adak', offset: -540, offsetLabel: 'GMT -9' },
    { name: 'Pacific/Honolulu', offset: -600, offsetLabel: 'GMT -10' },
    { name: 'Brazil/Rio de Janeiro', offset: -180, offsetLabel: 'GMT -3' },
    { name: 'Canada/St. Johns', offset: -150, offsetLabel: 'GMT -2.5' },
    { name: 'United Kingdom/London', offset: -0, offsetLabel: 'GMT -0' },
    { name: 'France/Paris', offset: +60, offsetLabel: 'GMT +1' },
    { name: 'South Africa/Cape Town', offset: +120, offsetLabel: 'GMT +2' },
    { name: 'Kenya/Nairobi', offset: +180, offsetLabel: 'GMT +3' },
    { name: 'Iran/Tehran', offset: +210, offsetLabel: 'GMT +3.5' },
    { name: 'United Arab Emirates/Dubai', offset: +240, offsetLabel: 'GMT +4' },
    { name: 'Afghanistan/Kabul', offset: +270, offsetLabel: 'GMT +4.5' },
    { name: 'Pakistan/Islamabad', offset: +300, offsetLabel: 'GMT +5' },
    { name: 'India/Mumbai', offset: +330, offsetLabel: 'GMT +5.5' },
    { name: 'Thailand/Bangkok', offset: +420, offsetLabel: 'GMT +7' },
    { name: 'China/Beijing', offset: +480, offsetLabel: 'GMT +8' },
    { name: 'South Korea/Seoul', offset: +540, offsetLabel: 'GMT +9' },
    { name: 'Australia/Brisbane', offset: +600, offsetLabel: 'GMT +10' },
    { name: 'South Australia/Adelaide', offset: +630, offsetLabel: 'GMT +10.5' },
    { name: 'Australia/Sydney', offset: +660, offsetLabel: 'GMT +11' },
    { name: 'New Zealand/Auckland', offset: +780, offsetLabel: 'GMT +13' },
  ];

  static getTSVStringFromObjectList(objectList) {
    let csvString = "";

    if (objectList.length == 0) {
      return csvString;
    }
    
    let headerList = Object.keys(objectList[0]);
    let headerString = headerList.join("\t");
    csvString += headerString + "\n";

    objectList.forEach((info) => {
      let contentList = headerList.map((columnName) => {
        return JSON.stringify(info[columnName]);
      });

      let contentString = contentList.join("\t");
      csvString += contentString + "\n";
    });

    return csvString;
  }

  static getCSVStringFromObjectList(objectList) {
    let csvString = "";

    if (objectList.length == 0) {
      return csvString;
    }
    
    let headerList = Object.keys(objectList[0]);
    let headerString = headerList.join(",");
    csvString += headerString + "\n";

    objectList.forEach((info) => {
      let contentList = headerList.map((columnName) => {
        return `"${JSON.stringify(info[columnName])}"`;
      });

      let contentString = contentList.join(",");
      csvString += contentString + "\n";
    });

    return csvString;
  }

  static getObjectAsJSONDiff(oldObj, newObj) {
    let oldDocument = JSON.parse(JSON.stringify(oldObj));
    let newDocument = JSON.parse(JSON.stringify(newObj));
    return getDiff(oldDocument, newDocument, true);
  }

  static syncToFirstDateTimeBeforeUnit(datetime1, datetime2, unitString) {
    let unitIndex = GeneralUtility.unitList.indexOf(unitString);
    let newDateTime2 = DateTime.fromObject(datetime2.toObject());

    for (let i = 0; i < this.unitList.length; i++) {
      let curUnit = this.unitList[i];

      if (i < unitIndex) {
        let unitsString = `${unitString}s`;
        let option = { [curUnit]: datetime1.get(curUnit) };
        newDateTime2 = newDateTime2.set(option);
      }
    }

    return [datetime1, newDateTime2];
  }

  static getWeekdayOrWeekend(datetime) {
    return DateTimeHelper.getWeekdayOrWeekend ? 
      DateTimeHelper.getWeekdayOrWeekend(datetime) :
      (datetime.weekday < 6 ? "weekday" : "weekend");
  }

  static setToReferenceDateAndSeconds(datetime, referenceDateTime) {
    return datetime.set({ year: referenceDateTime.year, month: referenceDateTime.month, day: referenceDateTime.day, second: referenceDateTime.second, millisecond: referenceDateTime.millisecond });
  }

  static convertToUTCWithUTCDate(datetimeString, referenceUTC) {
    console.log(`convertToUTCWithUTCDate DateTime.fromISO(datetimeString).toUTC(): ${DateTime.fromISO(datetimeString).toUTC()}`);
    return DateTime.fromISO(datetimeString).toUTC().set({ year: referenceUTC.year, month: referenceUTC.month, day: referenceUTC.day, second: referenceUTC.second, millisecond: referenceUTC.millisecond });
  }

  static extractSurveyLinkFromAction(actionInfo) {
    let surveyURL = "";

    if (actionInfo["surveyType"] != undefined && actionInfo["surveyType"].length > 0) {
      if (actionInfo["surveyType"] == "surveyLink") {
        surveyURL = actionInfo["surveyLink"];
      }
    }

    return surveyURL;
  }

  static generateCompositeIDForFitbitUpdate(aList = []) {
    return aList.join("_");
  }

  static removeFitbitUpdateDuplicate(updateList, includeStatus = false) {
    console.log(`${this.name} removeFitbitUpdateDuplicate: updateList.length: ${updateList.length}`);
    let compositeIDMap = {};

    let filteredList = updateList.filter((item) => {
      let idComponentList = [item.ownerId, item.collectionType, item.date];

      if (includeStatus) {
        idComponentList.push(item.status);
      }
      let compositeId = GeneralUtility.generateCompositeIDForFitbitUpdate(idComponentList);

      if (compositeIDMap[compositeId] == undefined) {
        compositeIDMap[compositeId] = true;
        return true;
      }
      else {
        return false;
      }
    });

    return filteredList;
  }

  static isRequestFromLocalhost(req) {
    let ip = GeneralUtility.getIPFromRequest(req);
    let ipSplit = ip.split(":");
    return ipSplit[ipSplit.length - 1] == "127.0.0.1";
  }

  static getIPFromRequest(req) {
    let forwarded = req.headers["x-forwarded-for"];
    console.log(`getIPFromRequest: req.headers["x-forwarded-for"]: ${forwarded}`);
    console.log(`getIPFromRequest:  req.connection.remoteAddress: ${req.connection.remoteAddress}`);
    let ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;
    return ip;
  }

  static convertRandomizationResultToString(rResult) {
    let result = "";

    switch (rResult.type) {
      case "noAction":
        result = `noAction`;
        break;
      default:
        if (rResult.theChoice != undefined) {
          result = `chance: ${rResult.theChoice.chance}, random: ${rResult.randomNumber}`;
        }
        else {
          result = "";
        }
        break;
    }

    return result;
  }

  static extractOutcomeToString(theChoice) {
    let result = "";
    let excludeNameList = ["type"];

    if (theChoice != undefined) {
      result = `[${theChoice.chance}]${theChoice.action.type} -`;
      Object.keys(theChoice.action).forEach((propertyName) => {
        if (!excludeNameList.includes(propertyName)) {
          if (theChoice.action[propertyName] == undefined) {
            ;
          }
          else if (typeof theChoice.action[propertyName] != "string") {
            result = result + ` ${propertyName}:${theChoice.action[propertyName]}`;
          }
          else if (typeof theChoice.action[propertyName] == "string" && theChoice.action[propertyName].length > 0) {
            result = result + ` ${propertyName}:${theChoice.action[propertyName]}`;
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

  static extractUserKeyAttributesToString(userInfo) {
    if (userInfo == null) {
      return "";
    }

    let result = `gif: ${userInfo.gif}, salience: ${userInfo.salience}, modification: ${userInfo.modification}, weekdayWakeup: ${userInfo.weekdayWakeup}, weekendWakeup: ${userInfo.weekendWakeup}, timesonze: ${userInfo.timezone}`;
    return result;
  }

  static doesFitbitInfoExist(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.fitbitId != null && userInfo.fitbitId.length > 0 && userInfo.accessToken != null && userInfo.accessToken.length > 0 && userInfo.refreshToken != null && userInfo.refreshToken.length > 0;
  }

  static isPreferredNameSet(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.preferredName != undefined && userInfo.preferredName.length > 0;
  }

  static isWakeBedTimeSet(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.weekdayWakeup != undefined && userInfo.weekdayBed != undefined && userInfo.weekendWakeup != undefined && userInfo.weekendBed != undefined;
  }

  static isFitbitReminderTurnOff(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.fitbitReminderTurnOff != undefined && userInfo.fitbitReminderTurnOff;
  }

  static isWalkToJoySaveToContacts(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.saveWalkToJoyToContacts != undefined && userInfo.saveWalkToJoyToContacts;
  }

  static isWalkSetTo10(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.autoWalkTo10 != undefined && userInfo.autoWalkTo10;
  }

  static isTimezoneSet(userInfo) {
    if (userInfo == null) {
      return false;
    }

    return userInfo.timezone != undefined;
  }

  static isUserInfoPropertyValueMatched(userInfo, propertyValueObject) {
    let result = true;

    Object.keys(propertyValueObject).forEach((propertyName) => {
      if (userInfo[propertyName] != propertyValueObject[propertyName]) {
        result = false;
      }
    });

    return result;
  }

  static extractUserInfoPropertyValueMatched(userInfo, propertyValueObject) {
    let resultInfo = {};

    Object.keys(propertyValueObject).forEach((propertyName) => {
      resultInfo[propertyName] = userInfo[propertyName];
    });

    return resultInfo;
  }

  static reduceBooleanArray(bArray, operator) {
    let result = true;
    let initialValue = bArray.length > 0 ? bArray[0] : false;

    switch (operator) {
      case "and":
        result = bArray.reduce((previousValue, currentValue) => previousValue && currentValue, initialValue);
        break;
      case "or":
        result = bArray.reduce((previousValue, currentValue) => previousValue || currentValue, initialValue);
        break;
      case "not any":
        result = !bArray.reduce((previousValue, currentValue) => previousValue || currentValue, initialValue);
        break;
      default:
        break;
    }

    return result;
  }
}
