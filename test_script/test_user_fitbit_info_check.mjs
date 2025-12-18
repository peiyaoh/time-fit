import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}


let userList = await prisma.users.findMany();

console.log(`users: ${JSON.stringify(userList)}`);

userList = userList.filter((userInfo) => {
    return GeneralUtility.doesFitbitInfoExist(userInfo);
});




console.log(`users with fitbit info: ${JSON.stringify(userList)}`);
