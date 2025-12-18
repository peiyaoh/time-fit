import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";

let resetList = ["participant8", "participant40", "participant44"];

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

async function resetUser(username) {
    let deleteValue = {
        unset: true,
      };

    let result = await prisma.users.update({
        where: { username: username },
        data: {
            preferredName: deleteValue,
            phone: deleteValue,
            timezone: deleteValue,
            phase: "baseline",
            joinAt: deleteValue,
            activateAt: deleteValue,
            completeAt: deleteValue,
            fitbitReminderTurnOff: false,
            saveWalkToJoyToContacts: false,
            autoWalkTo10: false,
            fitbitId: deleteValue,
            fitbitDisplayName: deleteValue,
            fitbitFullName: deleteValue,
            accessToken: deleteValue,
            refreshToken: deleteValue,
            weekdayWakeup: deleteValue,
            weekdayBed: deleteValue,
            weekendWakeup: deleteValue,
            weekendBed: deleteValue
        },
    });
}

await resetUser("test1");