import Layout from "../component/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import Button from '@mui/material/Button';
import { getServerSession } from "next-auth/next";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import { authOptions } from "./api/auth/[...nextauth]";



export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  console.log(`main.getServerSideProps: session: ${JSON.stringify(session)}`);

  if (!session) {
    return {
      props: {},
    };
  }

  let userName = session.user.name;

  const uniqueUser = await UserInfoHelper.getUserInfoByUsername(userName);

  console.log(`main.getServerSideProps: user: ${JSON.stringify(uniqueUser)}`);

  const userInfo = JSON.parse(JSON.stringify(uniqueUser, UserInfoHelper.convertDateToString));

  return {
    props: { userInfo },
  };
}

export default function TurnOffFitbitReminder({ userInfo }) {
  const { data: session, status } = useSession();
  const router = useRouter();


  // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
  if (status == "loading") return <div>loading...</div>;

  if (!session) {
    router.push("/");
    return null;
  }

  console.log(`session: ${JSON.stringify(session)}`);

  async function updateInfo(
    username,
    info
  ) {
    console.log(`TurnOffFitbitReminder.updateInfo: ${username}`);
    console.log(`TurnOffFitbitReminder.updateInfo.info: ${JSON.stringify(info)}`);

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
    console.log(`onSaveClick: userInfo.fitbitReminderTurnOff ${userInfo.fitbitReminderTurnOff}`);
    preparationInfo = {
        saveWalkToJoyToContacts: true
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
    <Layout title={"Save WalkToJoy to your Contacts"} description={""}>
        <h1 className="project-text">Save WalkToJoy to your Contacts</h1>
        <img src='/image/svg/save-to-contacts.svg' alt="Save to contacts"/>

        <br />
        <br />
        <Button 
          className="project-button"
          variant="contained"

          onClick={(event) => {
            onSaveClick(event);
            return;
          }}
        >
          Added to my Contacts
        </Button>
        <br />
        <br />
        <Button variant="contained" style={{ width: "100%", display: "none" }}

          onClick={(event) => {
            router.push("/main");
            return;
          }}
        
        >
          Cancel
        </Button>


      </Layout>
  );
}
