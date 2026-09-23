import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

console.log(`HOST_URL: ${process.env.HOST_URL}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
