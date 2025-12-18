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

function readCSVAndInsert(fileName) {
    console.log(`readCSVAndInsert.fileName: ${fileName}`);
    let results = [];
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
        console.log(`readCSVAndInsert.data(): ${data}`);
      })
      .on("end", () => {
        console.log(`readCSVAndInsert.end()`);

        console.log(results);
        
        let convertedResults = results.map((result) => {
            return {...result, 
                gif: result.gif.toLowerCase() == "true",
                salience: result.salience.toLowerCase() == "true",
                modification: result.modification.toLowerCase() == "true",
            }
        });

        insertUsers(convertedResults);
      });
  }

let fileName = "test_output/participant_20221202T134212.525.csv";

readCSVAndInsert(fileName);