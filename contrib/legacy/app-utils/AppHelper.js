import voca from "voca";
import StringHelper from "@time-fit/helper/StringHelper";
import SurveyResponseHelper from "@time-fit/helper/SurveyResponseHelper";
import DateTimeHelper from "@time-fit/helper/DateTimeHelper";
import TaskLogHelper from "@time-fit/helper/TaskLogHelper";

export default class AppHelper {
  constructor() {}

  static async sendTwilioMessage(phone, messageBody, mediaUrlList = []) {
    console.log(`AppHelper.sendTwilioMessage: ${phone} - ${messageBody}`);

    const result = await fetch("/api/twilio?function_name=send_message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            phone,
            messageBody,
            mediaUrlList: mediaUrlList.length > 0 ? mediaUrlList : null
        }),
    }).then((r) => {
        return r.json();
    });

    console.log(`AppHelper.sendTwilioMessage: result: ${result}`);
    return result;
  }

  static async composeUserMessageForTwilio(
    userInfo,
    messageInfo,
    surveyURL = ""
  ) {
    let result = "";

    if (
      messageInfo["interventionMessage"] != undefined &&
      messageInfo["interventionMessage"].length > 0
    ) {
      result += messageInfo["interventionMessage"] + " ";
    }

    if (
      messageInfo["walkMessage"] != undefined &&
      messageInfo["walkMessage"].length > 0
    ) {
      result += messageInfo["walkMessage"] + " ";
    }

    const placeholderReplaceResult =
      await AppHelper.replacePlaceholderFromMessage(
        result,
        userInfo,
        surveyURL
      );

    result = placeholderReplaceResult.message;

    if (
      placeholderReplaceResult.surveyReplaced == false &&
      surveyURL.length > 0
    ) {
      result += `${surveyURL}?study_code=${userInfo.username} .`;
    }

    return result;
  }

  static async replacePlaceholderFromMessage(message, userInfo, surveyLink) {
    let result = {
      nameReplaced: false,
      surveyReplaced: false,
      message: message,
    };

    if (result.message.includes("[PID]")) {
      result.message = voca.replaceAll(
        result.message,
        "[PID]",
        userInfo.username
      );
      result.nameReplaced = true;
    }

    if (result.message.includes("[name]")) {
      result.message = voca.replaceAll(
        result.message,
        "[name]",
        userInfo.preferredName
      );
      result.nameReplaced = true;
    }

    if (result.message.includes("<link>")) {
      const surveySeg = `${surveyLink}?study_code=${userInfo.username}`;
      result.message = voca.replaceAll(result.message, "<link>", surveySeg);
      result.surveyReplaced = true;
    }

    // Handle dynamic placeholders with square brackets
    const matchList = StringHelper.matchSqureBracketPlaceholder(result.message);

    for (let i = 0; i < matchList.length; i++) {
      const match = matchList[i];

      if (v.startsWith(match, "response", 1)) {
        const trimmedString = v.trim(v.trim(match, "["), "]");
        const mSplit = trimmedString.split("|");
        const surveyIdListString = mSplit[1];
        const surveyIdList = surveyIdListString.split(":");
        let responseList = [];

        for (let j = 0; j < surveyIdList.length; j++) {
          const surveyId = surveyIdList[j];
          const oneResponseList =
            await SurveyResponseHelper.getSurveyResponseFromPersonDuringPeriod(
              surveyId,
              userInfo.username,
              DateTime.utc().minus({ years: 1 }),
              DateTime.utc(),
              1
            );
          if (oneResponseList.length > 0) {
            responseList.push(oneResponseList[0]);
          }
        }

        responseList.sort((responseA, responseB) => {
          const diffInSeconds = DateTimeHelper.diffDateTime(
            DateTime.fromJSDate(responseA.dateTime),
            DateTime.fromJSDate(responseB.dateTime),
            "seconds"
          ).toObject().seconds;
          return diffInSeconds;
        });

        let lastResponse = "";
        if (responseList.length > 0) {
          lastResponse = responseList[0]["content"];
        }
        result.message = voca.replaceAll(result.message, match, lastResponse);
        result.surveyReplaced = true;
      }

      if (v.startsWith(match, "survey_link_from_tasks", 1)) {
        const trimmedString = v.trim(v.trim(match, "["), "]");
        const mSplit = trimmedString.split("|");
        const taskLabelListString = mSplit[1];
        const taskLabelList = taskLabelListString.split(":");
        let taskLogWithSurveyLinkList = [];

        for (let j = 0; j < taskLabelList.length; j++) {
          const taskLabel = taskLabelList[j];

          const taskLogList =
            await TaskLogHelper.findTaskLogWithTaskLabelForPersonDuringPeriod(
              taskLabel,
              userInfo.username,
              DateTime.utc().minus({ years: 1 }),
              DateTime.utc(),
              0
            );

          const filteredTaskLogList = taskLogList.filter((taskLog) => {
            return (
              taskLog.randomizationResult.theChoice != undefined &&
              taskLog.randomizationResult.theChoice.action.surveyLink.length > 0
            );
          });

          if (filteredTaskLogList.length > 0) {
            taskLogWithSurveyLinkList.push(filteredTaskLogList[0]);
          }
        }

        taskLogWithSurveyLinkList.sort((itemA, itemB) => {
          const diffObject = DateTimeHelper.diffDateTime(
            DateTime.fromJSDate(itemA.dateTime),
            DateTime.fromJSDate(itemB.dateTime),
            "seconds"
          ).toObject();

          const diffInSeconds = diffObject.seconds;
          return diffInSeconds;
        });

        let lastSurveyLink = "";
        if (taskLogWithSurveyLinkList.length > 0) {
          lastSurveyLink =
            taskLogWithSurveyLinkList[0].randomizationResult.theChoice.action
              .surveyLink;
        }

        const surveySeg = `${lastSurveyLink}?study_code=${userInfo.username}`;
        result.message = voca.replaceAll(result.message, match, surveySeg);
        result.surveyReplaced = true;
      }
    }

    return result;
  }
}
