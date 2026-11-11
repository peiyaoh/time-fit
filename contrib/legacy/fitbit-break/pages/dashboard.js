
import Layout from '../component/Layout';
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import SurveyResponseTable from "../component/SurveyResponseTable";
import FitbitNotificationTable from "../component/FitbitNotificationTable";
import TaskTable from "../component/TaskTable";
import TaskLogTable from "../component/TaskLogTable";
import MessageTable from "../component/MessageTable";
import FitbitSubscriptionTable from "../component/FitbitSubscriptionTable";
import FitbitDataTable from "../component/FitbitDataTable";
import UserTable from "../component/UserTable";
import UpdateDiffTable from "../component/UpdateDiffTable";
import { authOptions } from "./api/auth/[...nextauth]"
import { getServerSession } from "next-auth/next";
import { useSession } from "next-auth/react";
import { DateTime } from "luxon";
import ObjectHelper from '@time-fit/helper/ObjectHelper';
import UserInfoHelper from '@time-fit/helper/UserInfoHelper';
import FitbitSubscriptionHelper from '@time-fit/fitbit-integration/FitbitSubscriptionHelper.js';
import TaskHelper from '@time-fit/helper/TaskHelper';

const adminUsernameList = ["test1", "test2", "test3", "test4"];

const notRenderingList = ["Fitbit Notification", "Fitbit Data", "Update Diff", "Task Log By User", "Task Log"];

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session) {
    return {
      props: {},
    };
  }

  const userName = session.user.name;


  const aUser = await UserInfoHelper.getUserInfoByUsername(userName);

  const userInfo = JSON.parse(JSON.stringify(aUser, ObjectHelper.convertDateToString));

  let userList = [];
  let userInfoList = [];

  let responseList = [];
  let responseInfoList = [];

  let fitbitSubscriptionList = [];
  let fitbitSubscriptionInfoList = [];

  let fitbitNotificationList = [];
  let fitbitNotificationInfoList = [];

  let fitbitDataList = [];
  let fitbitDataInfoList = [];

  let updateDiffList = [];
  let updateDiffInfoList = [];

  let taskList = [];
  let taskInfoList = [];

  let taskLogList = [];
  let taskLogInfoList = [];

  let taskLogGroupByList = [];
  let taskLogGroupByInfoList = [];

  let taskLogInvestigatorList = [];
  let taskLogInvestigatorInfoList = [];

  let messageList = [];
  let messageInfoList = [];

  const queryLimit = 150;


  const nowDate = DateTime.now();
  const startDate = nowDate.minus({ weeks: 1 }).startOf("day");
  const sevenDaysConstraint = {
    gte: startDate.toISO(),
    lte: nowDate.toISO()
  };

  const forteenDaysConstraint = {
    gte: nowDate.minus({ weeks: 2 }).startOf("day").toISO(),
    lte: nowDate.toISO()
  };

  if (adminUsernameList.includes(userName)) {
    fitbitSubscriptionList = await FitbitSubscriptionHelper.getSubscriptionList("desc");
    if (fitbitSubscriptionList) {
      // Process the retrieved subscriptions
      fitbitSubscriptionInfoList = JSON.parse(JSON.stringify(fitbitSubscriptionList, ObjectHelper.convertDateToString));
    } else {
      // Handle the case when no subscriptions are found
      // ...
    }
  }

  if (adminUsernameList.includes(userName)) {
    taskList = await TaskHelper.getTasksSortedByCreatedAt("asc");
    taskInfoList = JSON.parse(JSON.stringify(taskList, ObjectHelper.convertDateToString));
  }

  const assetHostURL = `${process.env.ASSET_HOST_URL}`;

  return {
    props: { fitbitSubscriptionInfoList,  taskInfoList,  userInfo, assetHostURL },
  };
}

export default function Dashboard({ fitbitSubscriptionInfoList, taskInfoList,  userInfo, assetHostURL }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabName, setTabName] = useState("Users");


  const [userInfoList, setUserInfoList] = useState([]);

  const [fitbitDataInfoList, setFitbitDataInfoList] = useState([]);

  const [fitbitNotificationInfoList, setFitbitNotificationInfoList] = useState([]);

  const [responseInfoList, setResponseInfoList] = useState([]);

  const [updateDiffInfoList, setUpdateDiffInfoList] = useState([]);

  const [messageInfoList, setMessageInfoList] = useState([]);

  const [taskLogInfoList, setTaskLogInfoList] = useState([]);

  const [taskLogInvestigatorInfoList, setTaskLogInvestigatorInfoList] = useState([]);

  const handleTabChange = (event, newTabName) => {
    setTabName(newTabName);
  };

  const nowDate = DateTime.now();
  const startDate = nowDate.minus({ weeks: 1 }).startOf("day");

  useEffect(() => {
    fetch('/api/user?function_name=get', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        setUserInfoList(data.result)
      })
  }, []);

  useEffect(() => {
    fetch('/api/message?function_name=get', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessageInfoList(data.result)
      })
  }, []);

  useEffect(() => {
    fetch('/api/response?function_name=get', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        setResponseInfoList(data.result)
      })
  }, []);

    useEffect(() => {
      fetch('/api/fitbit-data?function_name=get', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: nowDate.minus({ days: 7 }).startOf("day"), // startDate.toISO(),
          endDate: nowDate.toISO()
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setFitbitDataInfoList(data.result)
        })
    }, []);

    useEffect(() => {
      fetch('/api/fitbit-update?function_name=get', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
            body: JSON.stringify({
              startDate: nowDate.minus({ days: 7 }).startOf("day"), // startDate.toISO(),
              endDate: nowDate.toISO()
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              setFitbitNotificationInfoList(data.result)
            })
    }, []);

  useEffect(() => {
    fetch('/api/update-diff?function_name=get', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({             
        startDate: nowDate.minus({ days: 7 }).startOf("day"), // startDate.toISO(),
      endDate: nowDate.toISO()}),
    })
      .then((res) => res.json())
      .then((data) => {
        setUpdateDiffInfoList(data.result)
      })
  }, []);

  useEffect(() => {
    fetch('/api/task-log?function_name=get', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 0,
        startDate: nowDate.minus({ days: 7 }).startOf("day"), // startDate.toISO(),
        endDate: nowDate.toISO()
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTaskLogInfoList(data.result)
      })
  }, []);


  useEffect(() => {
    fetch('/api/task-log?function_name=get_investigator', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 0,
        startDate: nowDate.minus({ days: 7 }).startOf("day"), // startDate.toISO(),
        endDate: nowDate.toISO()
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTaskLogInvestigatorInfoList(data.result)
      })
  }, []);

  // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
  if (status == "loading") return <div>loading...</div>;

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <Layout title={"Fitbit Break"} description={""}>
      <ToggleButtonGroup
        value={tabName}
        exclusive
        onChange={handleTabChange}
        aria-label="tab name"
      >
        <ToggleButton value="Users" aria-label="left aligned">
          Users
        </ToggleButton>
        <ToggleButton value="Survey Response" aria-label="left aligned">
          Survey Response
        </ToggleButton>
        <ToggleButton
          value="Fitbit Subscription"
          aria-label="centered"
        >
          Fitbit Subscription
        </ToggleButton>
        <ToggleButton
          value="Fitbit Notification"
          aria-label="centered"
        >
          Fitbit Notification
        </ToggleButton>
        <ToggleButton
          value="Fitbit Data"
          aria-label="centered"
        >
          Fitbit Data
        </ToggleButton>
        <ToggleButton
          value="Update Diff"
          aria-label="centered"
        >
          Update Diff
        </ToggleButton>
        <ToggleButton
          value="Task"
          aria-label="centered"
        >
          Task
        </ToggleButton>
        <ToggleButton
          value="Investigator Task Log"
          aria-label="centered"
        >
          Investigator Task Log
        </ToggleButton>

        <ToggleButton
          value="Task Log"
          aria-label="centered"
        >
          All Task Log
        </ToggleButton>
        <ToggleButton
          value="Message"
          aria-label="centered"
        >
          Message
        </ToggleButton>
      </ToggleButtonGroup>

      {tabName == "Users" ? (
        <UserTable infoList={userInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Survey Response" ? (
        <SurveyResponseTable infoList={responseInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Fitbit Subscription" ? (
        <FitbitSubscriptionTable infoList={fitbitSubscriptionInfoList} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Fitbit Notification" ? (
        <FitbitNotificationTable infoList={fitbitNotificationInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}
      {tabName == "Fitbit Data" ? (
        <FitbitDataTable infoList={fitbitDataInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Update Diff" ? (
        <UpdateDiffTable infoList={updateDiffInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Task" ? (
        <TaskTable infoList={taskInfoList} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Investigator Task Log" ? (
        <TaskLogTable infoList={taskLogInvestigatorInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}



      {tabName == "Task Log" ? (
        <TaskLogTable infoList={taskLogInfoList} userInfo={userInfo} renderData={!notRenderingList.includes(tabName)} />
      ) : null}

      {tabName == "Message" ? (
        <MessageTable infoList={messageInfoList} userInfo={userInfo} assetHostURL={assetHostURL} renderData={!notRenderingList.includes(tabName)} />
      ) : null}
    </Layout>
  );
}