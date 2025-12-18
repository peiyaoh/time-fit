import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
import FitbitHelper from "../lib/FitbitHelper.mjs";



if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const theUser = await prisma.users.findFirst({
    where:{
        username: "test1"
    }
});

const fitbitID = theUser.fitbitId;
const accessToken = theUser.accessToken;

FitbitHelper.getActivityGoalsForFitbitID(fitbitID, accessToken, "daily")
.then((responseData) => {
  console.log(
      `FitbitHelper.getActivityGoalsForFitbitID: responseData: ${JSON.stringify(responseData)}`
    );

    let action = {
        type: "updateStepsGoalToFitbitServer", // messageLabel, or messageGroup
        messageLabel: "", //messageLabel, only matter if the type is messageLabel
        messageGroup: "", // "nongif-m", // messageGroup, only matter if the type is messageGroup
        avoidHistory: false, // if we want to minimize the chance of sending the same message to the same user in a short window
    };
  return TaskExecutor.executeActionForUser(action, theUser, DateTime.now());
})
.then((responseData) => {
    console.log(
      `FitbitHelper.setActivityGoalsForFitbitID: responseData: ${JSON.stringify(
        responseData
      )}`
    );
  })
  .then(() => {
    return FitbitHelper.getActivityGoalsForFitbitID(
      fitbitID,
      accessToken,
      "daily"
    ).then((responseData) => {
      console.log(
        `FitbitHelper.getActivityGoalsForFitbitID: responseData: ${JSON.stringify(
          responseData
        )}`
      );
    });
  })
  .catch((error) => {
    let resultObj = {};
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`Data: ${JSON.stringify(error.response.data)}`);
      console.log(`Status: ${error.response.status}`);
      console.log(`StatusText: ${error.response.statusText}`);
      console.log(`Headers: ${JSON.stringify(error.response.headers)}`);

      console.log(`Error response`);
      resultObj = eval(`(${inspect(error.response.data)})`);
      // which means, authentication falil
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);

      console.log(`Error request`);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);

      console.log("Error else");
    }
    //res.status(error.response.status).json({ response: inspect(error.response.data) });

    return { value: "failed", data: resultObj };
  });