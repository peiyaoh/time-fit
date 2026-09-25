import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import { DateTime } from "luxon";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let userInfo = await prisma.users.findFirst({
    where: {
        username: "test1"
    }
});

let result = await DatabaseUtility.updateUserInfo(userInfo, {
    phase: "intervention",
    activateAt: DateTime.utc().toISO()
});

