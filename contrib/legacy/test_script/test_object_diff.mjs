import * as dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
import prisma from "../lib/prisma.mjs";
import GeneralUtility from "../lib/GeneralUtility.mjs";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

let userList = await prisma.users.findMany();

let oldDocument = userList[0];
let newDocument = userList[0];

console.log(`oldDocument: ${JSON.stringify(oldDocument, null, 2)}`);
console.log(`newDocument: ${JSON.stringify(newDocument, null, 2)}`);


// now, see if I can calculate the diff
let documentDiff = {};

if(oldDocument == null){
    console.log(`oldDocument == null`);
    documentDiff = GeneralUtility.getObjectAsJSONDiff({}, newDocument);
}
else{
    console.log(`oldDocument != null`);
    documentDiff = GeneralUtility.getObjectAsJSONDiff(oldDocument, newDocument);
}

console.log(`documentDiff: ${JSON.stringify(documentDiff, null, 2)}`);

// now, insert the diff
let diffDocument = await prisma.update_diff.create({
    data: {
        collectionName: "fitbit_data",
        documentId: newDocument.id,
        documentDiff: documentDiff
    }
});




console.log(`diffDocument: ${JSON.stringify(diffDocument, null, 2)}`);