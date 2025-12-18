import * as dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import TwilioHelper from "../lib/TwilioHelper.mjs";

let tResult = await TwilioHelper.sendMessage("7342773256", "test", []);
console.log(`TwilioHelper.sendMessage: ${JSON.stringify(tResult)}`);
