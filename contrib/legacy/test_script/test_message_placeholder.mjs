import DatabaseUtility from "../lib/DatabaseUtility.mjs";
import prisma from "../lib/prisma.mjs";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

let aUser = await prisma.users.findFirst({
    where: {
        username: "test2"
    }
});

let userInfo = JSON.parse(JSON.stringify(aUser, replacer));


// template: [response|SV_73Dz01KrwwLUyk6:SV_bw498iRdfDhdLme|last]
// let sampleMesssageTemplate = `Your last response: [response|SV_73Dz01KrwwLUyk6:SV_bw498iRdfDhdLme|last].`;

// template:[survey_link_from_tasks|SV_bBoOhje0dSNbZgq:SV_cACIS909SMXMUp8|last]
let sampleMesssageTemplate = `Your last survey link: [survey_link_from_tasks|intervention_planning_1:intervention_planning_2-6|last].`;


let resultMsg = await DatabaseUtility.replacePlaceholderFromMessage(sampleMesssageTemplate, userInfo, "");


console.log(`resultMsg: ${JSON.stringify(resultMsg, null, 2)}`);