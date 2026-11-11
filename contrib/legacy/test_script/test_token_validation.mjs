import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import FitbitHelper from "../lib/FitbitHelper.mjs";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const users = await prisma.users.findMany();


let introspectTokenResultList = [];
let userInfo;

// test toekn refresh second
// try refresh the second one
userInfo = users[1];

let refreshUpdateResult = await DatabaseUtility.refreshAndUpdateTokenForUser(userInfo);
console.log(`refreshUpdateResult: ${JSON.stringify(refreshUpdateResult, null, 2)}`);
