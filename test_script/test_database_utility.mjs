import * as dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
import GeneralUtility from "../lib/GeneralUtility.mjs";

import DatabaseUtility from "../lib/DatabaseUtility.mjs";


if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let now = DateTime.now().startOf("minute");

console.log(`now: ${now}`);

let before = now.minus({seconds: 69});
let after = now.plus({seconds: 69});

let unit = ["seconds"];

console.log(`diffDateTime(before:${before}, ${now}, ${unit}): ${JSON.stringify(GeneralUtility.diffDateTime(before, now, unit).toObject(), null, 2)}`);

console.log(`diffDateTime(after:${after}, ${now}, ${unit}): ${JSON.stringify(GeneralUtility.diffDateTime(after, now, unit).toObject(), null, 2)}`);