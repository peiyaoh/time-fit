import * as dotenv from "dotenv";
import { DateTime } from "luxon";
import prisma from "../lib/prisma.mjs";
import TaskExecutor from "../lib/TaskExecutor.mjs";
import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import v from "voca";
import csvWriter from "csv-write-stream";
import fs from "fs";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let username = "test1";

// this gives you the number of taskLog that associated with this particular user.
let endDateString = DateTime.now().toISO();
let startDateString = DateTime.now().minus({days: 7}).toISO();

let taskLogFailedList = await prisma.taskLog.findMany({
  where: {
    taskLabel: "fitbit process notification",
    createdAt: {
        gte: startDateString,
        lte: endDateString
    }
  },
});

taskLogFailedList = taskLogFailedList.filter((taskLog) => {
    return taskLog.executionResult.value.status == "failed";
});


let taskLogFailedBecuaseTokenList = taskLogFailedList.filter((taskLog) => {
    return v.includes(taskLog.executionResult.value.errorMessage, "Refresh token invalid");
});


let failedTokenListList = taskLogFailedList.map((taskLog) => {
    let errorLogStringList = v.replaceAll(v.replaceAll(taskLog.executionResult.value.errorMessage, "\n", ""), "'", "\"").split("-");

    let tokenList = errorLogStringList.filter((errorString) => {return errorString.length > 5;}).map((errorString) => {
        let tokenIndexStart = errorString.indexOf("Refresh token invalid: ") + "Refresh token invalid: ".length;
        let tokenIndexEnd = errorString.indexOf(". Visit https");

        if(tokenIndexStart > 0 && tokenIndexEnd > 0){
            return errorString.substring(tokenIndexStart, tokenIndexEnd);
        }
        else{
            return "";
        }

    }).filter((str) => {return str.length > 0;});

    let errorTokenWithCreatedAtList = tokenList.map((token) => {
        return {token, createdAt: DateTime.fromJSDate(taskLog.createdAt).setZone("America/New_York").toISO()};
    });

    return errorTokenWithCreatedAtList;
});

let failedTokenInfoList = [];

failedTokenListList.forEach((tokenList) => {
    failedTokenInfoList.push(...tokenList);
});

//console.log(`failedTokenInfoList: ${JSON.stringify(failedTokenInfoList)}`);

// ok, now, go find the user..... LOG

let refrehTokenUserMap = {};

let setTokenList = [];

failedTokenInfoList.forEach((tokenInfo) => {
    let token = tokenInfo.token;
    //console.log(`Token: ${token}`);
    if(!setTokenList.includes(token)){
        setTokenList.push(token);
    }
});

console.log(`setTokenList: ${JSON.stringify(setTokenList)}`);

for(let i = 0; i < setTokenList.length;i++){
    let token = setTokenList[i];

    // now, get the user
    let userInfo = await prisma.users.findFirst({
        where: { refreshToken: token }
    });

    //console.log(`token [${token}], userInfo: ${JSON.stringify(userInfo)}`);

    if(userInfo != undefined){
        refrehTokenUserMap[token] = userInfo;
    }
}

//console.log(`refrehTokenUserMap: ${JSON.stringify(refrehTokenUserMap)}`);



// now, dump the token?

failedTokenInfoList = failedTokenInfoList.map((tokenInfo) => {
    let userInfo = refrehTokenUserMap[tokenInfo.token];

    if(userInfo){
        return {
            username: userInfo.username,
            fitbitId: userInfo.fitbitId,
            ...tokenInfo,
        };
    }
    return {
        username: undefined,
        fitbitId: undefined,
        ...tokenInfo,
    };
});


console.log(
    `failedTokenInfoList: ${JSON.stringify(failedTokenInfoList, null, 2)}`
);

async function writeToCSV(resultList, outputFileName) {
    var writer = csvWriter({ sendHeaders: true });
    writer.pipe(fs.createWriteStream(outputFileName));
    resultList.forEach((result) => {
      writer.write(result);
    });
    writer.end();
  }

let dateString = DateTime.now().toISO({ format: 'basic', includeOffset: false });

let prefix = "error-token";
let exportFileName = `./test_output/${prefix}_${dateString}.csv`;

await writeToCSV(failedTokenInfoList, exportFileName);