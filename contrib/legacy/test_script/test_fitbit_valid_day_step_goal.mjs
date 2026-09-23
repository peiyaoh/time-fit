import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import ServerUtility from "../lib/ServerUtility.mjs";


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



//const dateGoalList = await DatabaseUtility.getUserFitbitDailyGoalAndWearingMinutesDuringPeriodById(theUser.fitbitId, "2024-11-10", "2024-12-02", "steps");

//console.log("dateGoalList" + JSON.stringify(dateGoalList));


const wearingDateGoalList = await DatabaseUtility.getUserFitbitDailyGoalsForWearingDaysDuringPeriodById(theUser.fitbitId, "2024-11-10", "2024-12-02", "steps", 60 * 8, 3);

console.log("wearingDateGoalList" + JSON.stringify(wearingDateGoalList));


// calculate average step goals
const averageStepGoal = wearingDateGoalList.reduce((total, next) => total + next.goal, 0) / wearingDateGoalList.length;

console.log("averageStepGoal:", averageStepGoal);

const randomMultiplier = [0.6, 0.8, 1.2][ServerUtility.getRandomIntInclusiveRNG(0, 2)];
            
console.log("randomMultiplier:", randomMultiplier);

const roundedStepGoal = Math.floor(averageStepGoal * randomMultiplier/100) * 100;

console.log("roundedStepGoal:", roundedStepGoal);
