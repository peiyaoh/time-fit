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

console.log(`userInfo: ${JSON.stringify(userInfo)}`);

let timeInfo = {
    reference: "joinAtDate",
    offset: { type: "plus", value: { days: 0} } // Send message 1day after the activation day
};

let startDateTime = GeneralUtility.generateStartOrEndDateTimeByReference(DateTime.now(), userInfo, timeInfo, "start");


console.log(`startDateTime: ${JSON.stringify(startDateTime, null, 2)}`);