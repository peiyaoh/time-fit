import FitbitHelper from "../lib/FitbitHelper.mjs";
import { inspect } from "util";
import prisma from "../lib/prisma.mjs";
import * as dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const theUser = await prisma.users.findFirst({
  where: { username: "test1" },
});

const fitbitID = theUser.fitbitId;
const accessToken = theUser.accessToken;

FitbitHelper.setActivityGoalsForFitbitID(
  fitbitID,
  accessToken,
  "daily",
  "steps",
  12000
)
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
