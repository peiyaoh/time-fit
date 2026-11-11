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
import bcrypt from "bcrypt";


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

  console.log(`username: ${username}`);

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

async function writeToCSV(resultList, outputFileName) {
  var writer = csvWriter({ sendHeaders: true });
  writer.pipe(fs.createWriteStream(outputFileName));
  resultList.forEach((result) => {
    writer.write(result);
  });
  writer.end();
}

function generateGroupAssignmentList(populationSize) {
  console.log(`generateGroupAssignmentList for ${populationSize} participants`);
  let gList = [];

  for (let i = 0; i < populationSize; i++) {
    let groupAssignment = {
      gif: Math.floor(i / 4)%2,
      salience: Math.floor(i / 2)%2,
      modification: i % 2
    };
    console.log(`${i}: [${groupAssignment.gif}, ${groupAssignment.salience}, ${groupAssignment.modification}]`);

    gList.push(groupAssignment);
  }

  return gList;
}




let initialDelay = 1000;
let interval = 1000;
let startIndex = 1; //1;
let endIndex = 5; //65;

let prefix = `test`;


//deleteAccountWithPrefix(prefix);


let groupAssignmnetList = generateGroupAssignmentList(endIndex - startIndex);


let resultList = [];


const saltRounds = 10;

for (let i = startIndex; i < endIndex; i++) {
  let username = `${prefix}${i}`;
  let password = "test";

  let passwordHash = await bcrypt.hash(password, saltRounds).then((hashPassword) => {
    // Store hash in your password DB.
    return hashPassword;
  });

  let hash = md5(username); // password

  let gAssignment = groupAssignmnetList[i - startIndex];

  console.log(`[${username}]: ${password}: ${gAssignment}`);
  let newStudyCodeObj = {
    username,
    password: passwordHash,
    passwordRaw: password,
    hash,
    //gif: true, //gAssignment.gif ==1? true: false,
    //salience: true, // gAssignment.salience ==1? true: false,
    //modification: false, //gAssignment.modification ==1? true: false,
  };

  resultList.push(newStudyCodeObj);

}


let dateString = DateTime.now().toISO({ format: 'basic', includeOffset: false });

/*
let exportFileName = `../../test_output/${prefix}_${dateString}.csv`;

let fileResultList = resultList.map((result) => {
  let copy = JSON.parse(JSON.stringify(result));
  delete copy.password;

  return copy;
});


await writeToCSV(fileResultList, exportFileName);
*/


timer(initialDelay, interval).pipe(
  takeWhile(x => {
    return startIndex + x < endIndex;
  }),
  map(x => {
    let newStudyCodeObj = resultList[x];
    return newStudyCodeObj;
  })
).subscribe(newStudyCodeObj => {
  console.log(newStudyCodeObj);

  delete newStudyCodeObj.passwordRaw;

  console.log(newStudyCodeObj);

  insertUser(newStudyCodeObj);

});


