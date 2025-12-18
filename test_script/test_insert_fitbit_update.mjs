import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
//import { DateTime } from "luxon";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const deleteTasks = await prisma.fitbit_update.deleteMany({})

let sampleFitbitUpdateList = await prisma.fitbit_update.createMany({
  data: GeneralUtility.fitbitUpdateSampleList
});

console.log(`Insert sampleFitbitUpdateList.length: ${sampleFitbitUpdateList.length}`);
