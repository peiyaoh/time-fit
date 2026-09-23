import voca from "voca";
import StringHelper from "@time-fit/helper/StringHelper";
import SurveyResponseHelper from "@time-fit/helper/SurveyResponseHelper";
import DateTimeHelper from "@time-fit/helper/DateTimeHelper";
import TaskLogHelper from "@time-fit/helper/TaskLogHelper";
import { AppHelper as AppHelperUtils, GeneralUtility } from "@time-fit/app-utils";

export default class AppHelper {
  constructor() {}

  static async sendTwilioMessage(phone, messageBody, mediaUrlList = []) {
    return AppHelperUtils.sendTwilioMessage(phone, messageBody, mediaUrlList);
  }

  static isPreferredNameSet(userInfo) {
    return GeneralUtility.isPreferredNameSet(userInfo);
  }

  static isWakeBedTimeSet(userInfo) {
    return GeneralUtility.isWakeBedTimeSet(userInfo);
  }

  static isFitbitReminderTurnOff(userInfo) {
    return GeneralUtility.isFitbitReminderTurnOff(userInfo);
  }

  static isWalkToJoySaveToContacts(userInfo) {
    return GeneralUtility.isWalkToJoySaveToContacts(userInfo);
  }

  static isWalkSetTo10(userInfo) {
    return GeneralUtility.isWalkSetTo10(userInfo);
  }

  static isTimezoneSet(userInfo) {
    return GeneralUtility.isTimezoneSet(userInfo);
  }

  static doesFitbitInfoExist(userInfo) {
    return GeneralUtility.doesFitbitInfoExist(userInfo);
  }

  static async composeUserMessageForTwilio(
    userInfo,
    messageInfo,
    surveyURL = ""
  ) {
    return AppHelperUtils.composeUserMessageForTwilio(userInfo, messageInfo, surveyURL);
  }

  static async replacePlaceholderFromMessage(message, userInfo, surveyLink) {
    return AppHelperUtils.replacePlaceholderFromMessage(message, userInfo, surveyLink);
  }
}
