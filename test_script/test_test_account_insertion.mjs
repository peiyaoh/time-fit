import md5 from "md5";
import { timer } from "rxjs";
import { map, takeWhile} from "rxjs/operators";
import prisma from "../lib/prisma.mjs";
import cryptoRandomString from 'crypto-random-string';

let initialDelay = 1000;
let interval = 1000;
let startIndex = 1;
let endIndex = 5;

async function deleteAccountWithPrefix(prefix){
  const deleteUsers = await prisma.users.deleteMany({
    where: {
      username: {
        contains: prefix,
      },
    },
  })
}

async function insertUser(newStudyCodeObj){
    await prisma.users.create({
        data: newStudyCodeObj
    });
}


await deleteAccountWithPrefix("test");

timer(initialDelay, interval).pipe(
  takeWhile(x => {
    return startIndex + x < endIndex;
  }),
  map(x => {
    // pilot
    //let studyCode = `pilotB${startIndex + x}`;
    
    // for testing account
    let username = `test${startIndex + x}`;

    // for simplicity
    // let password = username;

    // for security
    let password = cryptoRandomString({ length: 8, characters: 'abcdefghijkmnpqrstuvwxyz023456789' });


    let hash = md5(username); // password

    console.log(`[${username}]:[${password}] - ${hash}`);
    let newStudyCodeObj = {
      username,
      password, 
      hash
    };

    return newStudyCodeObj;
  })
).subscribe(newStudyCodeObj => {
  console.log(newStudyCodeObj);


  insertUser(newStudyCodeObj);

});
