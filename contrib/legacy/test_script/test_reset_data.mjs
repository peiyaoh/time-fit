import md5 from "md5";
import { timer } from "rxjs";
import { map, takeWhile} from "rxjs/operators";
import prisma from "../lib/prisma.mjs";
import cryptoRandomString from 'crypto-random-string';

let initialDelay = 1000;
let interval = 1000;
let startIndex = 1;
let endIndex = 5;

let collectionToResetList = [
    "fitbit_data","response", "fitbit_data", "fitbit_update", "fitbit_subscription", "message", "task", "taskLog"
];

async function emptyCollection(collectionName){
    const deleteItems = await prisma[collectionName].deleteMany({})
}

let results = collectionToResetList.forEach(async (collectionName) => {
    await emptyCollection(collectionName);
});