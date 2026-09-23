import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
//import { DateTime } from "luxon";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let messageInfo = await DatabaseUtility.findMessageByGroup("test", true, "test1");

console.log(`messageInfo: ${JSON.stringify(messageInfo)}`);

