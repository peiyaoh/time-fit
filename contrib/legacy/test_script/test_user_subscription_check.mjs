import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}



let fakeSubscription = [
    {
        collectionType: "activities",
        ownerId: "xyz",
        ownerType: "user",
        subscriberId: "1",
        subscriptionId: "1"
    },
    
    {
        collectionType: "userRevokedAccess",
        ownerId: "xyz",
        ownerType: "user",
        subscriberId: "1",
        subscriptionId: "2"
    }
    
];

const fakeSubscriptions = await prisma.fitbit_subscription.createMany({
    data: fakeSubscription
});


let userList = await DatabaseUtility.getUsersWithLessThanCertainSubscritions(2);

console.log(`usersWithIncopmleteSubscription: ${JSON.stringify(userList)}`);
