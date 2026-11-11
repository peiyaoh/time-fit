import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
//import { DateTime } from "luxon";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}


// insert the fake subscription first
//const deleteSubs = await prisma.fitbit_subscription.deleteMany({});

let sampleActivitySummary = {
    "activities": [
      {
        "activityId": 15000,
        "activityParentId": 15000,
        "activityParentName": "Sport",
        "calories": 290,
        "description": "",
        "duration": 2765000,
        "hasActiveZoneMinutes": false,
        "hasStartTime": true,
        "isFavorite": false,
        "lastModified": "2022-03-10T23:49:52.000Z", // original: "2022-03-10T23:39:52.000Z"
        "logId": 46556892631,
        "name": "Sport",
        "startDate": "2022-03-10",
        "startTime": "17:23",
        "steps": 2123
      }
    ],
    "goals": {
      "activeMinutes": 30,
      "caloriesOut": 2881,
      "distance": 8.05,
      "floors": 10,
      "steps": 10000
    },
    "summary": {
      "activeScore": -1,
      "activityCalories": 1247,
      "caloriesBMR": 1794,
      "caloriesOut": 2897,
      "distances": [
        {
          "activity": "total",
          "distance": 5.62
        },
        {
          "activity": "tracker",
          "distance": 5.62
        },
        {
          "activity": "loggedActivities",
          "distance": 0
        },
        {
          "activity": "veryActive",
          "distance": 1.17
        },
        {
          "activity": "moderatelyActive",
          "distance": 1.49
        },
        {
          "activity": "lightlyActive",
          "distance": 2.94
        },
        {
          "activity": "sedentaryActive",
          "distance": 0
        }
      ],
      "elevation": 0,
      "fairlyActiveMinutes": 45,
      "floors": 0,
      "heartRateZones": [
        {
          "caloriesOut": 1868.60288,
          "max": 91,
          "min": 30,
          "minutes": 1171,
          "name": "Out of Range"
        },
        {
          "caloriesOut": 882.32656,
          "max": 127,
          "min": 91,
          "minutes": 207,
          "name": "Fat Burn"
        },
        {
          "caloriesOut": 58.95472,
          "max": 154,
          "min": 127,
          "minutes": 7,
          "name": "Cardio"
        },
        {
          "caloriesOut": 0,
          "max": 220,
          "min": 154,
          "minutes": 0,
          "name": "Peak"
        }
      ],
      "lightlyActiveMinutes": 185,
      "marginalCalories": 705,
      "restingHeartRate": 73,
      "sedentaryMinutes": 906,
      "steps": 7620,
      "veryActiveMinutes": 23
    }
};

let updatedUserInfo = {fitbitId: "4SW9W9"};

let resultData = sampleActivitySummary;
let compositeId = GeneralUtility.generateCompositeIDForFitbitUpdate([updatedUserInfo.fitbitId,"activity-summary", resultData.activities[0].startDate]);
const updateRecord = await prisma.fitbit_data.upsert({
    where: {
        compositeId: compositeId
    },
    update: {
        lastModified: resultData.activities[0].lastModified,
        content: resultData
    },
    create: {
        compositeId: compositeId,
        dataType: "activity-summary",
        ownerId: updatedUserInfo.fitbitId,
        startDate: resultData.activities[0].startDate,
        lastModified: resultData.activities[0].lastModified,
        content: resultData
    },
  })


console.log(`updateRecord: ${JSON.stringify(updateRecord)}`);
