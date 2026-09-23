import * as dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
import GeneralUtility from "../lib/GeneralUtility.mjs";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let now = DateTime.now();
console.log(`now: ${now}`);
let nowUTC = now.toUTC();
console.log(`nowUTC: ${nowUTC}`);

let targetTime = nowUTC.minus({hours: 1});

//let zoneTime = targetTime.setZone("America/Detroit");

let zoneTime = targetTime.setZone(null);

console.log(`zoneTime: ${zoneTime}`);