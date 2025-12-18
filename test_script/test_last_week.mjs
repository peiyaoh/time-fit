import * as dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
import GeneralUtility from "../lib/GeneralUtility.mjs";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let now = DateTime.now();
console.log(`now: ${now}`);

let lastWeekInterval = GeneralUtility.getLastWeekAsInterval(now);

console.log(`lastWeekInterval: ${lastWeekInterval}, start: ${lastWeekInterval.start.toISODate()}, end: ${lastWeekInterval.end.toISODate()}`);