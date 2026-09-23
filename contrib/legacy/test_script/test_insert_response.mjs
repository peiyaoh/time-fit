import * as dotenv from "dotenv";
import prisma from "../lib/prisma.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
//import { DateTime } from "luxon";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const deleteResponses = await prisma.response.deleteMany({})

let sampleResponseList = await prisma.response.createMany({
  data: GeneralUtility.responseSampleList
});

console.log(`Insert sampleResponseList.length: ${sampleResponseList.length}`);
