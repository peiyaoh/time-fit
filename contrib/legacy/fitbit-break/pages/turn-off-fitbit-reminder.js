import Layout from "../component/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import Button from '@mui/material/Button';
import ObjectHelper from "@time-fit/helper/ObjectHelper";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import { authOptions } from "./api/auth/[...nextauth]"
import { getServerSession } from "next-auth/next"

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  console.log(`turn-off-fitbit-reminder.getServerSideProps: session: ${JSON.stringify(session)}`);

  if (!session) {
    return {
      props: {},
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
      fitbitReminderTurnOff: true
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
    <Layout title={"Turn Off Fitbit Reminder"} description={""}>


        <h1 className="project-text">Turn off Fitbit reminders to move</h1>
        <img src='/image/svg/turn-off-fitbit-reminders.svg' alt="Reminder"/>


        <br />
        <br />
        <Button 
        
          variant="contained"
          className="project-button"
          onClick={(event) => {
            onSaveClick(event);
            return;
          }}
        >
          Reminder is turned off
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
