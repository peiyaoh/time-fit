import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
//import { DateTime } from "luxon";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}




let msgLabel = "prompt_7";

let result = await DatabaseUtility.findMessageByLabel(msgLabel);






console.log(`findMessageByLabel [${msgLabel}] result:${result}`);
