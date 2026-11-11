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

let updateList = await prisma.task.findMany({
    where:{
        NOT: {
            label: {contains: "investigator"}
        },
    },
    //take: 5,
    orderBy: {
        createdAt: 'desc',
    },
})

updateList.forEach((update) => {
    console.log(`${update.label}`);
});


console.log(`includeList.length: ${JSON.stringify(updateList.length)}`);
