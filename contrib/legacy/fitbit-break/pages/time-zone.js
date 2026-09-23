import Layout from '../component/Layout';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useSession } from "next-auth/react"
import { useRouter } from 'next/router'
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Divider from "@mui/material/Divider";
import { authOptions } from "./api/auth/[...nextauth]"
import { getServerSession } from "next-auth/next"
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import TimeZoneHelper from '@time-fit/helper/TimeZoneHelper';
import ObjectHelper from '@time-fit/helper/ObjectHelper';

const { DateTime } = require("luxon");

export async function getServerSideProps(ctx) {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);

    if (!session) {
        return {
            props: {},
        };
    }

    const userName = session.user.name;

    const uniqueUser = await UserInfoHelper.getUserInfoByUsername(userName);    
    const extractedUser = UserInfoHelper.extractUserInfoCache(uniqueUser);
    const userInfo = JSON.parse(JSON.stringify(extractedUser, ObjectHelper.convertDateToString));
    
    return {
        props: { userInfo: userInfo },
    };
}


export default function TimeSetting({ userInfo }) {

    // print userInfo
    console.log(`userInfo: ${JSON.stringify(userInfo)}`);

    const { data: session, status } = useSession();
    const router = useRouter();

    const [weekdayWakeup, setWeekdayWakeup] = useState(userInfo.weekdayWakeup != undefined ? userInfo.weekdayWakeup : "");
    const [weekdayBed, setWeekdayBed] = useState(userInfo.weekdayBed != undefined ? userInfo.weekdayBed : "");

    const [weekendWakeup, setWeekendWakeup] = useState(userInfo.weekendWakeup != undefined ? userInfo.weekendWakeup : "");
    const [weekendBed, setWeekendBed] = useState(userInfo.weekendBed != undefined ? userInfo.weekendBed : "");

    let nowDateTime = DateTime.now();

    const [zoneName, setZoneName] = useState(userInfo.timezone != undefined ? userInfo.timezone : nowDateTime.zoneName);


    // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
    if (status == "loading") return <div>loading...</div>;

    if (!session) {
        router.push('/');
        return null;
    }

    console.log(`session: ${JSON.stringify(session)}`);

    // print all state variables
    console.log(`weekdayWakeup: ${weekdayWakeup}`);
    console.log(`weekdayBed: ${weekdayBed}`);
    console.log(`weekendWakeup: ${weekendWakeup}`);
    console.log(`weekendBed: ${weekendBed}`);
    console.log(`zoneName: ${zoneName}`);

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
                weekdayWakeup: dayWake,
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



    function onSaveClick(event) {
        updateTimePreference(userInfo.username, weekdayWakeup, weekdayBed, weekendWakeup, weekendBed, zoneName)
            .then((response) => {
                router.push("/main");
                return response;
            })
    }




    return (
        <Layout title={"Time Zone"} description={""}>
            <h1 className="project-text">Time Zone</h1>
            <div>
                <div>Selected Timezone: {zoneName} </div>
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
