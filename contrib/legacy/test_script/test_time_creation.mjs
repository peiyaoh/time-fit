import { DateTime } from "luxon";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
import prisma from "../lib/prisma.mjs";


let aUser = await prisma.users.findFirst({
    where: {
        username: "test1"
    }
});


function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

let userInfo = JSON.parse(JSON.stringify(aUser, replacer));

//console.log(`userInfo: ${JSON.stringify(userInfo)}`);

let dateString = "2023-02-22";


let targetDate = DateTime.fromISO(dateString, {zone: userInfo.timezone} );

console.log(`targetDate: [${targetDate}]--------------`);
