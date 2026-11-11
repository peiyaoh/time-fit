import Layout from '../component/Layout';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import {MobileTimePicker} from '@mui/x-date-pickers/MobileTimePicker';

import { useSession } from "next-auth/react"
import { useRouter } from 'next/router'
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Divider from "@mui/material/Divider";
const { DateTime } = require("luxon");
import Select from '@mui/material/Select';

import UserInfoHelper from '@time-fit/helper/UserInfoHelper.js';
import ObjectHelper from "@time-fit/helper/ObjectHelper.js";
import TimeZoneHelper from '@time-fit/helper/TimeZoneHelper.js';

import { authOptions } from "./api/auth/[...nextauth]"
import { getServerSession } from "next-auth/next"


export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  console.log(
    `main.getServerSideProps: session: ${JSON.stringify(session)}`
  );

  if(!session){
    return {
      props: {},
    };
  }

  let userName = session.user.name;

  const uniqueUser = await UserInfoHelper.getUserInfoByUsername(userName);

  console.log(
    `main.getServerSideProps: user: ${JSON.stringify(uniqueUser)}`
  );
  

  const userInfo = JSON.parse(JSON.stringify(uniqueUser, ObjectHelper.convertDateToString));
  
  return {
    props: { userInfo},
  };
}


export default function TimeSetting({ userInfo}) {

  const { data: session, status } = useSession();
  const router = useRouter();

  const [weekdayWakeup, setWeekdayWakeup] = useState(userInfo.weekdayWakeup != undefined? userInfo.weekdayWakeup: "");
  const [weekdayBed, setWeekdayBed] = useState(userInfo.weekdayBed != undefined? userInfo.weekdayBed: "");

  const [weekendWakeup, setWeekendWakeup] = useState(userInfo.weekendWakeup != undefined? userInfo.weekendWakeup: "");
  const [weekendBed, setWeekendBed] = useState(userInfo.weekendBed != undefined? userInfo.weekendBed: "");

  let nowDateTime = DateTime.now();

  const [zoneName, setZoneName] = useState(userInfo.timezone != undefined? userInfo.timezone: nowDateTime.zoneName);

  // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
  if (status == "loading") return <div>loading...</div>;

  if (!session) {
    router.push('/');
    return null;
  }

  console.log(`session: ${JSON.stringify(session)}`);

  async function updateTimePreference(username, dayWake, dayBed, endWake, endBed, timezone) {
    console.log(`TimSetting.updateTimePreference: ${username}`);
    console.log(`updateTimePreference, dayWake: ${dayWake}`);
    console.log(`updateTimePreference, dayBed: ${dayBed}`);
    console.log(`updateTimePreference, endWake: ${endWake}`);
    console.log(`updateTimePreference, endBed: ${endBed}`);
    console.log(`updateTimePreference, timezone: ${timezone}`);

    

    const result = await fetch("/api/user?function_name=update_time_preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        weekdayWakeup:dayWake,
        weekdayBed: dayBed,
        weekendWakeup: endWake,
        weekendBed: endBed,
        timezone: timezone
      }),
    }).then((r) => {
      return r.json();
    });

    return result;
  }

  const handleTimeZoneChange = (event) => {
    setZoneName(event.target.value);
  };

  

  function onSaveClick(event){
    updateTimePreference( userInfo.username, weekdayWakeup, weekdayBed, weekendWakeup, weekendBed, zoneName)
      .then((response) => {
        router.push("/main");
        return response;
      })
  }


  

  return (
    <Layout title={"Sleep Schedule"} description={""}>

        <h1 className="project-text">Waking Hours</h1>

        <div>
            <div>On <b>weekdays</b>, when do you typically <b>wake up</b>?</div><br />
            <MobileTimePicker
              label="Weekday Wake Up Time"
              value={weekdayWakeup}
              onChange={(newValue) => {
                setWeekdayWakeup(newValue);
                console.log(`setWeekdayWakeup: ${newValue}`);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <br /><br />
            <Divider />
            <br />
            <div>On <b>weekdays</b>, when do you typically <b>go to bed</b>?</div><br />
            <MobileTimePicker
              label="Weekday Bed Time"
              value={weekdayBed}
              onChange={(newValue) => {
                setWeekdayBed(newValue);
                console.log(`setWeekdayBed: ${newValue}`);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <br /><br />
            <Divider />
            <br />
            <div>On <b>weekends</b>, when do you typically <b>wake up</b>?</div><br />
            <MobileTimePicker
              label="Weekend Wake Up Time"
              value={weekendWakeup}
              onChange={(newValue) => {
                setWeekendWakeup(newValue);
                console.log(`setWeekendWakeup: ${newValue}`);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <br /><br />
            <Divider />
            <br />
            <div>On <b>weekends</b>, when do you typically <b>go to bed</b>?</div><br />
            <MobileTimePicker
              label="Weekend Bed Time"
              value={weekendBed}
              onChange={(newValue) => {
                setWeekendBed(newValue);
                console.log(`setWeekendBed: ${newValue}`);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <br /><br />
            <Divider />
            <br />
            <div>Timezone: {zoneName} </div>
            <br />
            <Select
              labelId="demo-simple-select-label"
              id="timezone-select"
              value={zoneName}
              label="Iime zone"
              onChange={handleTimeZoneChange}
            >
              {
                TimeZoneHelper.usTimeZoneOffetInfoList.map((zoneInfo, index) => {
                  console.log(`zoneInfo.name: ${zoneInfo.name}`);
                  return <MenuItem value={zoneInfo.name} key={index}>{zoneInfo.name} ({zoneInfo.offsetLabel})</MenuItem>;
                })
              }
            </Select>
            <br />
            <br />
            <Divider />
            <br />
            <Button 
              variant="contained" 
                className="project-button"
                onClick={onSaveClick} >Save</Button>
        </div>
    </Layout>
  )
}
