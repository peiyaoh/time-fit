import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Layout from "../component/Layout";

import TextField from "@mui/material/TextField";
/*
import logger from "../lib/logger";

*/

import { inspect } from "util";

import Link from "next/link";
import { useSession, signIn, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { Fragment, useState } from "react";
import Button from '@mui/material/Button';
import Divider from "@mui/material/Divider";
import prisma from "@time-fit/database/prisma.js";
import { DateTime } from "luxon";

function replacer(key, value) {
    if (typeof value === "Date") {
        return value.toString();
    }
    return value;
}

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export async function getServerSideProps(ctx) {
    const session = await getSession(ctx);
    console.log(`user-edit.getServerSideProps: session: ${JSON.stringify(session)}`);


    if (!session) {
        return {
            props: { userInfo: {} },
        };
    }

    console.log(`user-edit.getServerSideProps: query: ${JSON.stringify(ctx.query)}`);


    let userName = ctx.query.user; // session.user.name;

    let uniqueUser = undefined;

    if (adminUsernameList.includes(session.user.name)) {
        uniqueUser = await prisma.users.findFirst({
            where: { username: userName },
        });
    }


    console.log(`main.getServerSideProps: user: ${JSON.stringify(uniqueUser)}`);

    const userInfo = JSON.parse(JSON.stringify(uniqueUser, replacer));

    return {
        props: { userInfo },
    };
}

export default function UserReset({ userInfo }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    console.log(`InfoEdit.userInfo: ${JSON.stringify(userInfo)}`);

    const [preferredName, setPreferredName] = useState(
        userInfo != undefined && userInfo.preferredName != undefined ? userInfo.preferredName : ""
    );
    const [phone, setPhone] = useState(
        userInfo != undefined && userInfo.phone != undefined ? userInfo.phone : ""
    );

    // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
    if (status == "loading") return <div>loading...</div>;

    if (!session) {
        router.push("/");
        return null;
    }

    console.log(`session: ${JSON.stringify(session)}`);
    //console.log(`InfoEdit userInfo.joinAt: ${userInfo.joinAt}`);

    async function updateInfo(
        username,
        info
    ) {
        console.log(`InfoEdit.updateInfo: ${username}`);
        console.log(`InfoEdit.updateInfo.info: ${JSON.stringify(info)}`);

        const result = await fetch(
            "/api/user?function_name=update_info",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(info),
            }
        ).then((r) => {
            return r.json();
        });

        return result;
    }

    function onResetClick(event) {
        let preparationInfo = {
            username: userInfo.username, 
            preferredName: undefined,
            phone: undefined,
            timezone: undefined,
            phase: "baseline", 
            joinAt: undefined,
            activateAt: undefined,
            fitbitReminderTurnOff: false, 
            saveWalkToJoyToContacts: false, 
            gif: false,
            salience: false,
            modification: false,
            fitbitId: undefined,
            fitbitDisplayName: undefined,
            fitbitFullName: undefined,
            accessToken: undefined,
            refreshToken: undefined,
            weekdayWakeup: undefined,
            weekdayBed: undefined,
            weekendWakeup: undefined,
        };
        console.log(`onSaveClick: userInfo.joinAt ${userInfo.joinAt}`);

        updateInfo(
            userInfo.username,
            preparationInfo
        ).then((response) => {
            router.push("/dashboard");
            return response;
        });
    }

    return (
        <Layout title={"Preferred Name"} description={""}>
            <h1 className="project-text">Welcome to Fitbit Break!</h1>
            <h2 className="project-text">You are about to reset user info for: {userInfo.username}</h2>
            <h2 className="project-text">Please click &quot;leave&quot; if you did not intend to reset a user&apos;s data.</h2>
            <div>
                <div>Signed in as {session.user.name} </div>
                <div>Phone: {userInfo.phone} </div>
                <div>Phase: {userInfo.phase} </div>
                <div>Timezone: {userInfo.timezone} </div>
                <div>joinAt: {userInfo.joinAt} </div>
                <div>activateAt: {userInfo.activateAt} </div>
                <br />
                <br />
                <Fragment>
                    <Link href={"/main"}>
                        <Button
                            variant="contained"
                            className={"project-button-complete"}
                        >
                            Leave
                        </Button>
                    </Link>
                </Fragment>

                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />

                <Button variant="contained"
                    className="project-button"
                    onClick={onResetClick} >Reset Study Info</Button>
            </div>

        </Layout>
    );
}
