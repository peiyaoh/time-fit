import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import { DateTime } from "luxon";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let userList = await prisma.users.findMany({
    where: {
        username: {
          contains: "test1",
        },
      },
});


let theUser = userList[0];

console.log(JSON.stringify(theUser, null, 2));



const dateGoalList = await DatabaseUtility.getUserFitbitDateAndWearingMinutesListDuringPeriod(theUser.fitbitId, DateTime.fromISO("2024-11-10"), DateTime.fromISO("2024-12-02"));

console.log(JSON.stringify(dateGoalList, null, 2));