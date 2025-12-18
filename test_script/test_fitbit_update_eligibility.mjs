import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}



let recordList = [
    {
        "id": "63f4d6c36ff9520d57514dfa",
        "collectionType": "activities",
        "date": "2023-05-17",
        "ownerId": "7QYVGW",
        "ownerType": "walktojoy",
        "subscriptionId": "7QYVGW-activities",
        "status": "notification",
        "ip": "34.67.42.65",
        "validity": null,
        "createdAt": "2023-05-17T14:35:47.152Z",
        "updatedAt": "2023-05-17T14:36:01.318Z"
    },
    {
        "id": "63f4d6c36ff9520d57514dfa",
        "collectionType": "activities",
        "date": "2023-05-18",
        "ownerId": "7QYVGW",
        "ownerType": "walktojoy",
        "subscriptionId": "7QYVGW-activities",
        "status": "notification",
        "ip": "34.67.42.65",
        "validity": null,
        "createdAt": "2023-05-18T14:35:47.152Z",
        "updatedAt": "2023-05-18T14:36:01.318Z"
    },
    {
        "id": "63f4d6c36ff9520d57514dfa",
        "collectionType": "activities",
        "date": "2023-05-19",
        "ownerId": "7QYVGW",
        "ownerType": "walktojoy",
        "subscriptionId": "7QYVGW-activities",
        "status": "notification",
        "ip": "34.67.42.65",
        "validity": null,
        "createdAt": "2023-05-19T14:35:47.152Z",
        "updatedAt": "2023-05-19T14:36:01.318Z"
    },
];

for(let i = 0; i < recordList.length; i++){
    let fitbitUpdate = recordList[i];
    console.log(`[${fitbitUpdate.ownerId}][${fitbitUpdate.date}] ----------------------------------------`);
    let result = await DatabaseUtility.isFitbitUpdateDateWithinAppropriateScope(fitbitUpdate);
    console.log(`${fitbitUpdate.ownerId} - ${fitbitUpdate.date}: shouldUpdate? ${result}`);
}