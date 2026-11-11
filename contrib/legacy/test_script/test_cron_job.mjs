import nodeCron from "node-cron";
import axios from "axios";
import { DateTime } from "luxon";
import * as dotenv from 'dotenv';

let expressionLabelDict = {
  "1 minute": {
      label: 'every 1 minute',
      expression: '* * * * *'
  },
  "10 seconds": {
      label: 'every 10 seconds',
      expression: '*/10 * * * * *'
  }

};

let theExpression = expressionLabelDict["1 minute"];

let lastDate = undefined;

async function postClockEvent(date){
  console.log(`postClockEvent: ${DateTime.fromJSDate(date).toISO()}`);

  return axios({
    method: 'post',
    url: 'http://localhost:3000/api/cron',
    // `headers` are custom headers to be sent
    params: {
      'function_name': 'execute_task',//  'check_user_weekday_wakeup_time',
      'date': DateTime.fromJSDate(date).toISO()
    }
  })
  .then((response) => {
    //console.log(response.data);
    console.log(response.status);
    console.log(response.statusText);
    //console.log(response.headers);
    //console.log(response.config);

    let data = response.data;
    console.log(`Cron result: ${JSON.stringify(data)}`);
    return data;
  })
  .catch((error) => {
    console.error(`Error: ${error}`);
  });
}

nodeCron.schedule(theExpression.expression, async () => {
  const cronTime = process.hrtime();
  const now = DateTime.now().toJSDate();
  console.log(`execute cron event generation task ${theExpression.label} at ${now}`);
  const t1 = process.hrtime();

  if(lastDate !== undefined){
      const lastDateMinute = DateTime.fromJSDate(lastDate).startOf("minute").toJSDate();
      const nowMinute = DateTime.fromJSDate(now).startOf("minute").toJSDate();

      if(lastDateMinute.getTime() !== nowMinute.getTime()){
          await postClockEvent(now);
      }
      else{
          console.log(`${DateTime.fromJSDate(now).toISO()}: Skipping event generation as lastDate and now are the same at the minute level`);
      }
  }
  else{
      await postClockEvent(now);
  }

  lastDate = now;
  //console.log(`lasteDate (after): ${lastDate}`);
  
  const t2 = process.hrtime(t1);
  console.log('did tick in', t2[0] * 1000 + t2[1] / 100000, 'ms');
}, {recoverMissedExecutions: true});


