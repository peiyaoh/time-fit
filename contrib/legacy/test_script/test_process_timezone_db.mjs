//import md5 from "md5";
//import ServerService from "./utilities/ServerService";
import { timer } from "rxjs";
import { map, takeWhile } from "rxjs/operators";
import prisma from "../lib/prisma.mjs";
import cryptoRandomString from 'crypto-random-string';
import csvWriter from "csv-write-stream";
import fs from "fs";
import md5 from "md5";
import { DateTime } from "luxon";
import csv from "csv-parser";
import path from "path";

async function deleteAccountWithPrefix(prefix){
  const deleteUsers = await prisma.users.deleteMany({
    where: {
      username: {
        contains: prefix,
      },
    },
  })
}

async function insertUser(newStudyCodeObj) {
  const { username, ...rest } = newStudyCodeObj;


  let existRecord = await prisma.users.findFirst({
    where: {
      username: username
    }
  });

  console.log(`existRecord: ${existRecord}`);

  if (existRecord == null) {
    const user = await prisma.users.create({
      data: newStudyCodeObj
    })
  }
  else {

    const updateUser = await prisma.users.update({
      where: {
        username: username
      },
      data: {
        ...rest
      },
    })
  }
}

async function insertUsers(results) {
    // now insert into db using prisma
  
    const users = await prisma.users.createMany({
      data: results,
      //skipDuplicates: true, // Skip 'Bobo'
    });
  
    return users;
  }


function timezoneNameToOffset(zoneName){
    console.log(`timezoneNameToOffset: ${zoneName} -> ${DateTime.now().setZone(zoneName).offset}`);
    return DateTime.now().setZone(zoneName).offset;
}

function readCSVAndInsert(fileName) {
    console.log(`readCSVAndInsert.fileName: ${fileName}`);
    let results = [];
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
        //console.log(`readCSVAndInsert.data(): ${JSON.stringify(data)}`);
      })
      .on("end", () => {
        console.log(`readCSVAndInsert.end()`);

        let usResults = [...new Set(results.filter((zoneInfo) => {
            return zoneInfo["country_code"] == "US";
        }).map((zoneInfo) => {
            return zoneInfo["zone_name"];
        })
        
        )];

        console.log(usResults);

        
        usResults = usResults.map((zoneName) => {
            let offset = timezoneNameToOffset(zoneName);

            return {name: zoneName, offset: offset, offsetLabel: `GMT ${offset/60}`};
        });
      });
  }

let fileName = "content/db/time_zone.csv";

readCSVAndInsert(fileName);