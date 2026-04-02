import { DateTime, Interval } from "luxon";
import voca from 'voca';
import prisma from "./prisma.js";
import { inspect } from 'util';
import v from "voca";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

export default class DatabaseUtility {

    constructor() {

    }

    static async insertEvent(event){
        console.log(`DatabaseUtility.insertEvent: ${event}`);
        const createResult = await prisma.event.create({
            data: event
        });
        return createResult;
    }

    static async insertFitbitUpdateList(updateList){
        console.log(`DatabaseUtility.insertFitbitUpdateList: ${updateList.length}`);
        const createResult = await prisma.fitbit_update.createMany({
            data: updateList
        });
        return createResult;
    }

    static async findMessageByLabel(mLabel){
        console.log(`DatabaseUtility.findMessageByLabel: ${mLabel}`);
        const message = await prisma.message.findFirst({
            where: { label: mLabel},
        });
        return message;
    }

    static async composeUserMessageForTwilio(userInfo, messageInfo, surveyURL=""){
        console.log(`${this.name} composeUserMessageForTwilio: userInfo: ${userInfo}, messageInfo: ${messageInfo}, surveyURL: ${surveyURL}`);
        let result = "";

        // To Do: need to handle template for preferredName and survey link later

        if(messageInfo["interventionMessage"] != undefined && messageInfo["interventionMessage"].length > 0){
            result += messageInfo["interventionMessage"] + " ";
        }

        if(messageInfo["walkMessage"] != undefined && messageInfo["walkMessage"].length > 0){
            result += messageInfo["walkMessage"] + " ";
        }

        let placeholderReplaceResult = await DatabaseUtility.replacePlaceholderFromMessage(result, userInfo, surveyURL);

        result = placeholderReplaceResult.message;

        if(placeholderReplaceResult.surveyReplaced == false && surveyURL.length > 0){
            // now a randomSurvey
            result += `${surveyURL}?study_code=${userInfo.username} .`;
        }

        return result;
    }

    static async replacePlaceholderFromMessage(message, userInfo, surveyLink){
        let result = {
            nameReplaced: false,
            surveyReplaced: false,
            message: message
        };

        if( result.message.includes("[PID]")){
            console.log(`DatabaseUtility.replacePlaceholderFromMessage found [PID]`);
            result.message = voca.replaceAll(result.message, '[PID]', userInfo.username); 
            result.nameReplaced = true;
        }

        if( result.message.includes("[name]")){
            console.log(`DatabaseUtility.replacePlaceholderFromMessage found [name]`);
            result.message = voca.replaceAll(result.message, '[name]', userInfo.preferredName); 
            result.nameReplaced = true;
        }

        if( result.message.includes("<link>")){
            console.log(`DatabaseUtility.replacePlaceholderFromMessage found <link>`);
            let surveySeg = `${surveyLink}?study_code=${userInfo.username}`;
            result.message = voca.replaceAll(result.message, '<link>', surveySeg); 
            result.surveyReplaced = true;
        }

        if( result.message.includes("[goal]")){
            console.log(`DatabaseUtility.replacePlaceholderFromMessage found [goal]`);
            // set displayGoal to be userInfo.dailyStepGoal, if it is not set, set it to 5000
            const displayGoal = userInfo.dailyStepsGoal == undefined? 5000: userInfo.dailyStepsGoal;
            result.message = voca.replaceAll(result.message, '[goal]', `${displayGoal}`); 
            result.surveyReplaced = true;
        }

        // this should be generalized, but will deal with it as a special case for now
        let matchList = this.matchSqureBracketPlaceholder(result.message);

        for(let i = 0; i < matchList.length; i++){
            let match = matchList[i];
            // [response_surveyId_last]

            if(v.startsWith(match, 'response', 1)){
                // [response...]
                let trimmedString = v.trim(v.trim(match, "["), "]");
                console.log(`trimmedString: ${trimmedString}`);

                let mSplit = trimmedString.split("|");

                // verion 2: with possibly multiple IDs, separated by :
                // Example: [response|SV_bBoOhje0dSNbZgq:SV_cACIS909SMXMUp8|last]
                let surveyIdListString = mSplit[1];
                let surveyIdList = surveyIdListString.split(":");
                let responseList = [];

                for(let j = 0; j < surveyIdList.length; j++){
                    let surveyId = surveyIdList[j];

                    // updated with user
                    // findSurveyResponseFromPersonDuringPeriod
                    let oneResponseList  = await DatabaseUtility.findSurveyResponseFromPersonDuringPeriod(surveyId, userInfo.username, DateTime.utc().minus({years: 1}), DateTime.utc(), 1);

                    console.log(`oneResponseList for ${surveyId} length: ${oneResponseList.length}`);

                    if(oneResponseList.length > 0){
                        console.log(`Adding one response for ${surveyId}`);
                        responseList.push(oneResponseList[0]);
                    }
                }

                // now, need to sort the responses by their dateTime
                responseList.sort((responseA, responseB) => {
                    let diffInSeconds =  this.diffDateTime(DateTime.fromJSDate(responseA.dateTime), DateTime.fromJSDate(responseB.dateTime), "seconds").toObject().seconds;

                    console.log(`diffInSeconds: ${diffInSeconds}`);

                    return diffInSeconds;
                });

                // if there is, then only 1 is returend, otherwise, it would be empty
                // content
                let lastResponse = "";

                if(responseList.length > 0){
                    lastResponse = responseList[0]["content"];
                }

                console.log(`lastResponse: ${lastResponse}`);

                result.message = voca.replaceAll(result.message, match, lastResponse);

                result.surveyReplaced = true;
            }
        }

        return result;
    }

    static matchSqureBracketPlaceholder(message) {
        // This is a placeholder implementation - would need to import from GeneralUtility
        // For now, return empty array to avoid breaking functionality
        return [];
    }

    static diffDateTime(dateTimeA, dateTimeB, unit) {
        // This is a placeholder implementation - would need to import from GeneralUtility
        // For now, return empty object to avoid breaking functionality
        return { toObject: () => ({ seconds: 0 }) };
    }

    static async findMessageByGroup(gGroupName, avoidHistory=false, username=""){

        console.log(`DatabaseUtility.findMessageByGroup: ${gGroupName}, avoidHistory: ${avoidHistory}`);

        let messageList = [];

        if( avoidHistory ){
            messageList = (await DatabaseUtility.getUserMessageFromGroupWithLowestFrequency(username, gGroupName)).map((item) => {
                return item.info;
            });
        }
        else{
            messageList = await prisma.message.findMany({
                where: { group: gGroupName},
                orderBy: [
                    {
                      groupIndex: 'asc',
                    }
                  ],
            });
        }

        console.log(`DatabaseUtility.findMessageByGroup messageList.length: ${messageList.length}`);

        let randomIndex = Math.floor(messageList.length * Math.random());

        console.log(`DatabaseUtility.findMessageByGroup randomIndex: ${randomIndex}`);

        let pickedMessage = messageList[randomIndex];

        return pickedMessage;
    }

    static async getUserMessageFromGroupWithLowestFrequency(username, groupName){
        let frequencyDict = await DatabaseUtility.getUserMessageFromGroupCountDict(username, groupName);

        let frequencyList = Object.keys(frequencyDict).map((messageLabel) => {
            return {
                label: messageLabel,
                info: frequencyDict[messageLabel].info,
                frequency: frequencyDict[messageLabel].count
            };
        });

        frequencyList.sort((a, b) => {
            return a.frequency - b.frequency;
        });

        let lowestFrequency = frequencyList[0].frequency;

        let lowFrequencyList = frequencyList.filter((item) => {
            return item.frequency == lowestFrequency;
        });

        return lowFrequencyList;
    }

    static async getUserMessageFromGroupCountDict(username, groupName){
        const groupMessages = await prisma.message.findMany({
            where: {
                group: {
                    equals: groupName,
                },
            },
        });

        let messageLabelList = groupMessages.map((messageInfo) => {return messageInfo.label;});

        let userMessageCountDict = await DatabaseUtility.getCurrentUserMessageCountDict(username);
        let resultDict = {};

        groupMessages.forEach((messageInfo) => {
            let messageLabel = messageInfo["label"];

            if(userMessageCountDict[messageLabel] != undefined){
                resultDict[messageLabel] = {
                    info: messageInfo,
                    count: userMessageCountDict[messageLabel]
                };
            }
            else{
                resultDict[messageLabel] = {
                    info: messageInfo,
                    count: 0
                };
            }
        })

        return resultDict;
    }

    static async getCurrentUserMessageCountDict(username){
        console.log(`getCurrentUserMessageCountDict username: ${username}`);

        const results = await prisma.taskLog.groupBy({
            by: ['messageLabel'],
            where: {
                username: {
                    equals: username,
                },
            },
            _count: {
                messageLabel: true,
            },
        });
        
        let resultList = JSON.parse(JSON.stringify(results, replacer));

        let resultDict = {};
    
        resultList.forEach((result) => {
            if (result["messageLabel"] != null){
                resultDict[result["messageLabel"]] = result["_count"]["messageLabel"];
            }
        });
    
        return resultDict;
    }

    static async getUserFitbitWalkActivityListDuringPeriodById(fitbitId, startDateString, endDateString){

        console.log(`${this.name} getUserFitbitWalkActivityListDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}`);

        let recordList = await DatabaseUtility.getUserFitbitActivityDataDuringPeriodById(fitbitId, startDateString, endDateString);

        let activityList = [];

        recordList.forEach((record) => {
            if(record.content.activities.length > 0){
                activityList = activityList.concat(record.content.activities);
            }
        });

        console.log(`${this.name} getUserFitbitWalkActivityListDuringPeriodById activityList: ${activityList}`);

        let walkActivityList = activityList.filter((item) => {
            return item.activityParentName == "Walk";
        });

        return walkActivityList;
    }

    static async getUserFitbitAverageDailyStepsDuringPeriodById(fitbitId, startDateString, endDateString){
        console.log(`${this.name} getUserFitbitAverageDailyStepsDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}`);

        let averageSteps = 0;

        let recordList = await DatabaseUtility.getUserFitbitActivityDataDuringPeriodById(fitbitId, startDateString, endDateString);

        let stepsList = recordList.map((record) => {
            if(record.content.summary != undefined){
                return record.content.summary.steps;
            }
            else{
                return 0;
            }
            
        });

        console.log(`${this.name} getUserFitbitAverageDailyStepsDuringPeriodById stepsList: ${stepsList}`);

        let sum = stepsList.reduce((partialSum, a) => partialSum + a, 0);

        console.log(`${this.name} getUserFitbitAverageDailyStepsDuringPeriodById sum: ${sum}`);

        averageSteps = stepsList.length > 0 ? sum/stepsList.length: 0;

        return averageSteps;
    }

    static async getUserFitbitActivityDataDuringPeriodById(fitbitId, startDateString, endDateString){

        let recordList = await prisma.fitbit_data.findMany({
            where:{
                ownerId: fitbitId,
                dataType: "activity-summary", // Placeholder - would import from GeneralUtility
                dateTime: {
                    gte: startDateString,
                    lte: endDateString
                }
            }
        });

        return recordList;
    }

    static async getUserFitbitUpdateDuringPeriodByIdAndOwnerType(fitbitId, startDateTime, endDateTime, ownerType="user", collectionType="activities"){

        let recordList = await prisma.fitbit_update.findMany({
            where:{
                ownerId: fitbitId,
                ownerType: ownerType,
                collectionType: collectionType,
                createdAt: {
                    gte: startDateTime.toISO(),
                    lte: endDateTime.toISO()
                }
            },
        });

        return recordList;
    }

    static async getTaskLogWithErrorDuringPeriod(startDateTime, endDateTime){

        let recordList = await prisma.taskLog.findMany({
            where:{
                createdAt: {
                    gte: startDateTime.toISO(),
                    lte: endDateTime.toISO()
                }
            },
        });

        recordList = recordList.filter((taskLog) =>{
            return taskLog.executionResult["value"] != undefined && taskLog.executionResult.value.status == "failed";
        });
        

        return recordList;
    }

    static async getUserFitbitDateAndWearingMinutesListDuringPeriod(fitbitId, startDateTime, endDateTime){
        console.log(`${this.name} getUserFitbitDateAndWearingMinutesListDuringPeriod, fitbitId: ${fitbitId}, start: ${startDateTime}, end: ${endDateTime}`);
        let resultList = [];
        let minsList = [];

        let curDateTime = startDateTime;

        while( this.diffDateTime(curDateTime, endDateTime, "seconds").toObject().seconds >= 0){
            let aggregatedMinutes = await DatabaseUtility.getUserFitbitHeartRateIntradayMinutesByIdAndDate(fitbitId, curDateTime);

            console.log(`[${curDateTime}]: minutes: ${aggregatedMinutes}`);

            resultList.push({
                dateTime: curDateTime.toFormat('yyyy-MM-dd'),
                wearingMinutes: aggregatedMinutes,
            })
            // update curDate
            curDateTime = this.operateDateTime(curDateTime, {"days": 1}, "plus");
        }

        return resultList;
    }

    static operateDateTime(dateTime, operation, type) {
        // Placeholder implementation - would import from GeneralUtility
        return dateTime.plus(operation);
    }

    static async getUserFitbitWearingMinutesPerDayListDuringPeriod(fitbitId, startDateTime, endDateTime){
        console.log(`${this.name} getUserFitbitWearingMinutesPerDayListDuringPeriod, fitbitId: ${fitbitId}, start: ${startDateTime}, end: ${endDateTime}`);
        let resultList = [];
        let minsList = [];

        let curDateTime = startDateTime;

        while( this.diffDateTime(curDateTime, endDateTime, "seconds").toObject().seconds >= 0){
            let aggregatedMinutes = await DatabaseUtility.getUserFitbitHeartRateIntradayMinutesByIdAndDate(fitbitId, curDateTime);

            console.log(`[${curDateTime}]: minutes: ${aggregatedMinutes}`);

            minsList.push(aggregatedMinutes);

            // update curDate
            curDateTime = this.operateDateTime(curDateTime, {"days": 1}, "plus");
        }

        console.log(`${this.name} getUserFitbitWearingDaysDuringPeriod minsList: ${minsList}`);

        return minsList;
    }

    static async getUserFitbitHeartRateIntradayMinutesByIdAndDate(fitbitId, startDateTime){
        console.log(`${this.name} getUserFitbitHeartRateIntradayMinutesByIdAndDate, fitbitId: ${fitbitId}, dateTime: ${startDateTime}`);

        // get the time string
        let timeString = startDateTime.toFormat('yyyy-MM-dd');

        let record = await prisma.fitbit_data.findFirst({
            where:{
                ownerId: fitbitId,
                dataType: "activity-heart", // Placeholder - would import from GeneralUtility
                dateTime: timeString,
            },
        });

        let minutesTotal = 0;

        if(record != undefined){
            // version 2: use intraday
            let heartRateDataSet = record["content"]["activities-heart-intraday"]["dataset"];
            minutesTotal += heartRateDataSet.length;
        }

        return minutesTotal;
    }

    static async getUserFitbitDailyStepsForWearingDaysDuringPeriodById(fitbitId, startDateString, endDateString, goalType, wearingLowerBoundMinutes, recentLimit){
        console.log(`${this.name} getUserFitbitDailyStepsForWearingDaysDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}, goalType: ${goalType}, wearingLowerBoundMinutes: ${wearingLowerBoundMinutes}, recentLimit: ${recentLimit}`);

        const dateStepsList = await DatabaseUtility.getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById(fitbitId, startDateString, endDateString, "steps");

        const wearingDateStepsList = dateStepsList.filter((dateSteps) => {
            return dateSteps.wearingMinutes >= wearingLowerBoundMinutes;
        });

        // get the last three elements of the list
        const recentWearingDateGoalList = wearingDateStepsList.slice(-recentLimit);

        return recentWearingDateGoalList;
    }

    static async getUserFitbitDailyGoalsForWearingDaysDuringPeriodById(fitbitId, startDateString, endDateString, goalType, wearingLowerBoundMinutes, recentLimit){
        console.log(`${this.name} getUserFitbitDailyGoalsForWearingDaysDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}, goalType: ${goalType}, wearingLowerBoundMinutes: ${wearingLowerBoundMinutes}, recentLimit: ${recentLimit}`);

        const dateGoalList = await DatabaseUtility.getUserFitbitDailyGoalAndWearingMinutesDuringPeriodById(fitbitId, startDateString, endDateString, "steps");

        const wearingDateGoalList = dateGoalList.filter((dateGoal) => {
            return dateGoal.wearingMinutes >= wearingLowerBoundMinutes;
        });

        // get the last three elements of the list
        const recentWearingDateGoalList = wearingDateGoalList.slice(-recentLimit);

        return recentWearingDateGoalList;
    }

    static async getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById(fitbitId, startDateString, endDateString, summaryType){
        console.log(`${this.name} getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}, summaryType: ${summaryType}`);

        let dateStepsList = [];

        // This is activity-summary, with goals
        let recordList = await DatabaseUtility.getUserFitbitActivityDataDuringPeriodById(fitbitId, startDateString, endDateString);

        let startDate = DateTime.fromISO(startDateString);
        let endDate = DateTime.fromISO(endDateString);

        const dateAndMinsList = await DatabaseUtility.getUserFitbitDateAndWearingMinutesListDuringPeriod(fitbitId, startDate, endDate);

        // print the length of both lists
        console.log(`${this.name} getUserFitbitDailyStepsAndWearingMinutesDuringPeriodById recordList.length: ${recordList.length}, dateAndMinsList.length: ${dateAndMinsList.length}`);

        // now, start from the ending, find days actual records
        for(let i = 0; i <  dateAndMinsList.length; i++){
            let dateAndSteps = {};
            const dateMins = dateAndMinsList[i];

            let record = undefined;

            for(let j = recordList.length - 1; j >= 0; j--){
                if(recordList[j].dateTime == dateMins.dateTime){
                    record = recordList[j];
                    break;
                }
            }

            if(record == undefined){
                dateAndSteps =  {
                    dateTime: dateMins.dateTime,
                    steps: 0,
                    wearingMinutes: dateMins.wearingMinutes
                };
            }
            else{
                dateAndSteps =  {
                    dateTime: dateMins.dateTime,
                    steps: record.content.summary[summaryType],
                    wearingMinutes: dateMins.wearingMinutes
                };
            }
            dateStepsList.push(dateAndSteps);
        }

        return dateStepsList;
    }

    static async getUserFitbitDailyGoalAndWearingMinutesDuringPeriodById(fitbitId, startDateString, endDateString, goalType){
        console.log(`${this.name} getUserFitbitDailyGoalAndWearingMinutesDuringPeriodById fitbitId: ${fitbitId}, start: ${startDateString}, end:${endDateString}, goalType: ${goalType}`);

        let dateGoalList = [];

        // This is activity-summary, with goals
        let recordList = await DatabaseUtility.getUserFitbitActivityDataDuringPeriodById(fitbitId, startDateString, endDateString);

        let startDate = DateTime.fromISO(startDateString);
        let endDate = DateTime.fromISO(endDateString);

        const dateAndMinsList = await DatabaseUtility.getUserFitbitDateAndWearingMinutesListDuringPeriod(fitbitId, startDate, endDate);

        // print the length of both lists
        console.log(`${this.name} getUserFitbitDailyGoalAndWearingMinutesDuringPeriodById recordList.length: ${recordList.length}, dateAndMinsList.length: ${dateAndMinsList.length}`);

        // now, start from the ending, find days actual records
        for(let i = 0; i <  dateAndMinsList.length; i++){
            let dateAndGoal = {};
            const dateMins = dateAndMinsList[i];

            let record = undefined;

            for(let j = recordList.length - 1; j >= 0; j--){
                if(recordList[j].dateTime == dateMins.dateTime){
                    record = recordList[j];
                    break;
                }
            }

            if(record == undefined){
                dateAndGoal =  {
                    dateTime: dateMins.dateTime,
                    goal: 0,
                    wearingMinutes: dateMins.wearingMinutes
                };
            }
            else{
                dateAndGoal =  {
                    dateTime: dateMins.dateTime,
                    goal: record.content.goals[goalType],
                    wearingMinutes: dateMins.wearingMinutes
                };
            }
            dateGoalList.push(dateAndGoal);
        }

        return dateGoalList;
    }

    static async getUsersWithLessThanCertainSubscritions(threshold=2){

        let userList = await prisma.users.findMany({
            include: {
                fitbitSubscriptionList: true
            },
        })
        
        userList = userList.filter((userInfo) => {
            console.log(`user[${userInfo.username}] fitbitSubscriptionList.length: ${userInfo.fitbitSubscriptionList.length}`);
            return userInfo.fitbitSubscriptionList.length < threshold;
        });

        return userList;
    }

    static async getFitbitUpdateByStatusWithLimit(status="notification", limit=50, prioritizeSystemUpdate=true, favorRecent=true){
        console.log(`${this.name} getFitbitUpdateByStatusWithLimit: ${status}, limit=${limit}`);
        // version 2: proritize system update
        let updateList;
        let orderList = [
            {
                createdAt: favorRecent? 'desc': 'asc',
            },
        ];
        
        if( prioritizeSystemUpdate ){
            // sort by ownerType first
            orderList.unshift({
                ownerType: 'desc',
            });
        }

        let queryObj = {
            where:{
                status: status
            },
            orderBy: orderList
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        console.log(`${this.name} getFitbitUpdateByStatusWithLimit: orderList=${orderList}`);

        updateList = await prisma.fitbit_update.findMany(queryObj);

        return updateList;
    }

    static async isSurveyCompletedByPerson(surveyId, personId){
        console.log(`${this.name }.isSurveyCompletedByPerson: ${surveyId} by ${personId}`);

        let startDate = DateTime.utc(2000);
        let endDate = DateTime.utc();

        let responseList = await DatabaseUtility.findSurveyResponseDuringPeriod(surveyId, startDate, endDate, 0);
        

        responseList = responseList.filter((responseInfo) => {
            
            return responseInfo.participantId == personId;
        });

        return responseList.length > 0;
    }

    static async isSurveyCompleted(surveyId){
        console.log(`${this.name }.isSurveyCompleted: ${surveyId}`);

        let startDate = DateTime.utc(2000);
        let endDate = DateTime.utc();

        let responseList = await DatabaseUtility.findSurveyResponseDuringPeriod(surveyId, startDate, endDate, 1);

        return responseList.length > 0;
    }

    static async findTaskLogWithActionTypeDuringPeriod(actionType, startDateTime, endDateTime, limit=0){
        console.log(`${this.name }.findTaskLogWithActionTypeDuringPeriod: ${startDateTime}, ${endDateTime}`);

        let queryObj = {
            where: {
                createdAt: {
                    gte: startDateTime.toISO(),
                    lte: endDateTime.toISO()
                }
            },
            orderBy: [
                {
                    createdAt: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let itemList = await prisma.taskLog.findMany(queryObj);


        itemList = itemList.filter((itemInfo) => {
            
            return itemInfo["randomizationResult"]["theChoice"] != undefined && itemInfo["randomizationResult"]["theChoice"]["action"]["type"] == actionType;
        });

        return itemList;
    }

    static async findTaskLogWithTaskLabelDuringPeriod(taskLabel, startDateTime, endDateTime, limit=0){
        console.log(`${this.name }.findTaskLogDuringPeriod: ${startDateTime}, ${endDateTime}`);

        let queryObj = {
            where: {
                taskLabel: taskLabel,
                createdAt: {
                    gte: startDateTime.toISO(),
                    lte: endDateTime.toISO()
                }
            },
            orderBy: [
                {
                    createdAt: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let itemList = await prisma.taskLog.findMany(queryObj);

        return itemList;
    }

    static async findTaskLogWithTaskLabelForPersonDuringPeriod(taskLabel, personId, startDateTime, endDateTime, limit=0){
        console.log(`${this.name }.findTaskLogWithTaskLabelForPersonDuringPeriod: ${taskLabel}, ${personId}, ${startDateTime}, ${endDateTime}`);

        let queryObj = {
            where: {
                taskLabel: taskLabel,
                username: personId,
                createdAt: {
                    gte: startDateTime.toISO(),
                    lte: endDateTime.toISO()
                }
            },
            orderBy: [
                {
                    createdAt: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let itemList = await prisma.taskLog.findMany(queryObj);

        return itemList;
    }

    static async findTaskLogWithMessageLabelDuringPeriod(messageLabel, startDate, endDate, limit=0){
        console.log(`${this.name }.findTaskLogDuringPeriod: ${startDate}, ${endDate}`);

        let queryObj = {
            where: {
                messageLabel: messageLabel,
                createdAt: {
                    gte: startDate.toISO(),
                    lte: endDate.toISO()
                }
            },
            orderBy: [
                {
                    createdAt: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let itemList = await prisma.taskLog.findMany(queryObj);

        return itemList;
    }

    static async findTaskLogDuringPeriod(startDate, endDate, limit=0){
        console.log(`${this.name }.findTaskLogDuringPeriod: ${startDate}, ${endDate}`);

        let queryObj = {
            where: {
                createdAt: {
                    gte: startDate.toISO(),
                    lte: endDate.toISO()
                }
            },
            orderBy: [
                {
                    createdAt: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let itemList = await prisma.taskLog.findMany(queryObj);

        return itemList;
    }

    static async findSurveyResponseFromPersonDuringPeriod(surveyId, participantId, startDate, endDate, limit=0){
        console.log(`${this.name }.findSurveyResponseFromPersonDuringPeriod: ${surveyId}, ${participantId}, ${startDate.toISO()}, ${endDate.toISO()}`);

        let queryObj = {
            where: {
                surveyId: surveyId,
                participantId: participantId,
                dateTime: {
                    gte: startDate.toISO(),
                    lte: endDate.toISO()
                }
            },
            orderBy: [
                {
                    dateTime: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let responseList = await prisma.response.findMany(queryObj);

        return responseList;
    }

    static async findSurveyResponseDuringPeriod(surveyId, startDate, endDate, limit=0){
        console.log(`${this.name }.findSurveyResponoseDuringPeriod: ${surveyId}, ${startDate}, ${endDate}`);

        let queryObj = {
            where: {
                surveyId: surveyId,
                dateTime: {
                    gte: startDate.toISO(),
                    lte: endDate.toISO()
                }
            },
            orderBy: [
                {
                    dateTime: 'desc',
                }
            ]
        };

        if(limit > 0){
            queryObj["take"] = limit;
        }

        let responseList = await prisma.response.findMany(queryObj);

        return responseList;
    }

    static async updateToken(hashCode, accessToken, refreshToken, userInfo=null) {
        console.log(`updateToken, hashCode: ${hashCode}`);
        console.log(`updateToken, accessToken: ${accessToken}`);
        console.log(`updateToken, refreshToken: ${refreshToken}`);

        let theUser;

        if(userInfo == null){
            theUser = await prisma.users.findFirst({
                where: { hash: hashCode },
            });
        }
        else{
            theUser = userInfo;
        }

        const updatedUser = await prisma.users.update({
            where: { username: theUser.username },
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
            },
        });
    
        return updatedUser;
    }

    static async countSubscription(){
        const subCount = await prisma.fitbit_subscription.count();

        return subCount;
    }

    static async updateFitbitUpdateStatusWithSameSignatureBeforeTime(fUpdate, oldStatus="notification", newStatus="processed", timestamp){

        const updateOlderList = await prisma.fitbit_update.updateMany({
            where: {
                status: oldStatus,
                ownerId: fUpdate.ownerId,
                collectionType: fUpdate.collectionType,
                date: fUpdate.date,
                createdAt: {
                    lte: timestamp //fUpdate.createdAt
                },
            },
            data: {
                status: newStatus,
            },
        });

        return updateOlderList;
    }

    static async getUserInfoByUsername(username){

        console.log(`${this.name}: getUserInfoByUsername ${username}`);

        const theUser = await prisma.users.findFirst({
            where: {
                username: username,
            }
        });

        return theUser;
    }

    static async updateUserInfo(userInfo, propertyValueObject){

        const updateResult = await prisma.users.update({
            where: {
                username: userInfo.username,
            },
            data: {
                ...propertyValueObject
            },
        });

        return updateResult;
    }
}
