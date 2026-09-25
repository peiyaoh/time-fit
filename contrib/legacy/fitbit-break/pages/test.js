import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Layout from '../component/Layout';
/*
import logger from "../lib/logger";

*/

import { Button } from "@mui/material";

import { inspect } from "util";

import Link from "next/link";
import { useSession, signIn, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import GeneralUtility from "@time-fit/app-utils/GeneralUtility.js";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import prisma from "@time-fit/database/prisma.js";

import SurveyResponseTable from "../component/SurveyResponseTable";
import FitbitNotificationTable from "../component/FitbitNotificationTable";
import TaskTable from "../component/TaskTable";
import TaskLogTable from "../component/TaskLogTable";
import MessageTable from "../component/MessageTable";
import FitbitSubscriptionTable from "../component/FitbitSubscriptionTable";
import FitbitDataTable from "../component/FitbitDataTable";
import UserTable from "../component/UserTable";
import TaskLogGroupByTable from "../component/TaskLogGroupByTable";
import UpdateDiffTable from "../component/UpdateDiffTable";

import { DateTime } from "luxon";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

const adminUsernameList = ["test1", "test2", "test3", "test4"];

let notRenderingList = ["Fitbit Notification", "Fitbit Data", "Update Diff", "Task Log By User", "Task Log"];

export async function getServerSideProps(ctx) {
    const session = await getSession(ctx);
    if (!session) {
        return {
            props: {},
        };
    }

    let userName = session.user.name;


    console.log(`test.getServerSideProps: find user`);
    const aUser = await prisma.users.findFirst({
        where: { username: userName },
    });

    let userInfo = JSON.parse(JSON.stringify(aUser, replacer));

    let assetHostURL = `${process.env.ASSET_HOST_URL}`;

    // userInfoList,  taskLogInfoList,messageInfoList, responseInfoList, taskLogGroupByInfoList, updateDiffInfoList,fitbitDataInfoList,taskLogInvestigatorInfoList, fitbitNotificationInfoList,
    return {
        props: { userInfo, assetHostURL },
    };
}

//  userInfoList, taskLogInfoList,messageInfoList, responseInfoList, taskLogGroupByInfoList, updateDiffInfoList,  fitbitDataInfoList, taskLogInvestigatorInfoList,fitbitNotificationInfoList, 

export default function Dashboard({ userInfo, assetHostURL }) {
    const { data: session, status } = useSession();
    const router = useRouter();


    let nowDate = DateTime.now();

    async function callTestEndPoint(function_name) {
        return fetch(`/api/test?function_name=${function_name}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                limit: 0,
                startDate: nowDate.minus({ days: 21 }).startOf("day"),
                endDate: nowDate.toISO()
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                return data;
            })
    }

    // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
    if (status == "loading") return <div>loading...</div>;

    if (!session) {
        router.push("/");
        return null;
    }

    // Function for getting taskLog

    return (
        <Layout title={"Fitbit Break"} description={""}>
            <Button variant="contained" onClick={(event) => {

                callTestEndPoint("query").then((data) => {
                    console.log(`query data: ${JSON.stringify(data.result)}`);
                })
                    .catch((error) => { console.error(error); })

            }} >Call query</Button>
            <br />
            <Divider />
            <Button variant="contained" onClick={(event) => {
                callTestEndPoint("get").then((data) => {
                    console.log(`get data: ${JSON.stringify(data)}`);
                    console.log(`get data.result.length: ${JSON.stringify(data.result.length)}`);
                })
                    .catch((error) => { console.error(error); })

            }} >Call get</Button>
            <br />
            <Divider />
            <Button variant="contained" onClick={(event) => {

                callTestEndPoint("mongo-query").then((data) => {
                    console.log(`mongo-query data: ${JSON.stringify(data.result)}`);
                })
                    .catch((error) => { console.error(error); })

            }} >Call mongo-query</Button>
            <br />
            <Divider />
            <Button variant="contained" onClick={(event) => {
                callTestEndPoint("mongo-get").then((data) => {
                    console.log(`mongo-get data: ${JSON.stringify(data)}`);
                    console.log(`mongo-get data.result.length: ${JSON.stringify(data.result.length)}`);
                })
                    .catch((error) => { console.error(error); })

            }} >Call mongo-get</Button>


        </Layout>
    );
}

/*
{tabName == "Task Log By User" ? (
  <TaskLogGroupByTable infoList={taskLogGroupByInfoList} renderData={!notRenderingList.includes(tabName)} />
) : null}
*/