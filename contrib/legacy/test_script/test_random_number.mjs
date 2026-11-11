import * as dotenv from "dotenv";
import ServerUtility from "../lib/ServerUtility.mjs";


if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}


const randomNumber = ServerUtility.getRandomIntInclusiveRNG(0, 2);
            
console.log("randomNumber:", randomNumber);