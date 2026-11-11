import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Layout from "../component/Layout";
import TextField from "@mui/material/TextField";

import Link from "next/link";
import { useSession, signIn, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { Fragment, useState } from "react";
import Button from '@mui/material/Button';
import Divider from "@mui/material/Divider";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper.js";
import { DateTime } from "luxon";
import ObjectHelper from "@time-fit/helper/ObjectHelper.js";

function replacer(key, value) {
  if (typeof value === "Date") {
    return value.toString();
  }
  return value;
}

export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);
  console.log(`main.getServerSideProps: session: ${JSON.stringify(session)}`);

  if (!session) {
    return {
      props: {userInfo:{}},
    };
  }

  let userName = session.user.name;

  const uniqueUser = await UserInfoHelper.getUserInfoByUsername(userName);

  console.log(`main.getServerSideProps: user: ${JSON.stringify(uniqueUser)}`);

  const userInfo = JSON.parse(JSON.stringify(uniqueUser, ObjectHelper.convertDateToString));

  return {
    props: { userInfo },
  };
}

export default function InfoEdit({ userInfo }) {
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
        body: JSON.stringify({...info, 
          username: username
        }),
      }
    ).then((r) => {
      return r.json();
    });

    return result;
  }

  function onSaveClick(event) {
    let preparationInfo = undefined;
    console.log(`onSaveClick: userInfo.joinAt ${userInfo.joinAt}`);
    if(userInfo.joinAt == null){
      preparationInfo = {
        preferredName,
        phone,
        joinAt: userInfo.joinAt == null? DateTime.utc().toISO(): null
      }
    }
    else{
      preparationInfo = {
        preferredName,
        phone
      }
    }

    console.log(`onSaveClick: updatedInfo preparation ${JSON.stringify(preparationInfo, null, 2)}`);

    updateInfo(
      userInfo.username,
      preparationInfo
    ).then((response) => {
      router.push("/main");
      return response;
    });
  }

  return (
    <Layout title={"Preferred Name"} description={""}>
        <h1 className="project-text">Welcome to Fitbit Break!</h1>
        <h2 className="project-text">What name would you prefer to be called?</h2>
        <div>
          <TextField
            fullWidth
            label="Preferred Name"
            id="fullWidth"
            value={preferredName}
            onChange={(event) => {
                console.log(`setPreferredName: ${event.currentTarget.value}`);
              setPreferredName(event.currentTarget.value);
              
            }}
          />
          <br />
          <Divider />
          <br />
          <Fragment>{
            false? <TextField
            fullWidth
            label="Phone Number"
            id="fullWidth"
            value={phone}
            
            onChange={(event) => {
                console.log(`setPhone: ${event.currentTarget.value}`);
              setPhone(event.currentTarget.value);
            }}
          />: null }</Fragment>
          
          <br />
          <br />
          <Button variant="contained" 
          className="project-button"
          onClick={onSaveClick} >Continue</Button>
        </div>

      </Layout>
  );
}
