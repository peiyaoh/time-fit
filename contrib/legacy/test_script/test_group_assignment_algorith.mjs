//import md5 from "md5";
//import ServerService from "./utilities/ServerService";
import { timer } from "rxjs";
import { map, takeWhile} from "rxjs/operators";
import prisma from "../lib/prisma.mjs";
import cryptoRandomString from 'crypto-random-string';
import csvWriter from "csv-write-stream";
import fs from "fs";
import md5 from "md5";
import { DateTime } from "luxon";

function generateGroupAssignmentList(populationSize){
    for(let i = 0; i < populationSize; i++){
        let groupAssignment = {
            gif: Math.floor(i/4),
            salience: Math.floor(i%4/2),
            modification: i%2
        };
        console.log(`${i}: [${groupAssignment.gif}, ${groupAssignment.salience}, ${groupAssignment.modification}]`);
    }
}

generateGroupAssignmentList(8);