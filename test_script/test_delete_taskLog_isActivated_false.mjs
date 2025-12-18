import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const deleteTasks = await prisma.taskLog.deleteMany({
    where: {
        isActivated: false
    }
});

console.log(`Delete taskLog isActivated==false: ${JSON.stringify(deleteTasks)}`);
