import Layout from '../component/Layout';
import { toast } from "react-toastify";
import { Button } from "@mui/material";
import { inspect } from "util";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useState, Fragment } from "react";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ObjectHelper from '@time-fit/helper/ObjectHelper';
import { authOptions } from "./api/auth/[...nextauth]"
import { getServerSession } from "next-auth/next"
import UserInfoHelper from '@time-fit/helper/UserInfoHelper';
import FitbitAPIHelper from '@time-fit/fitbit-integration/FitbitAPIHelper.js';
import SurveyResponseHelper from '@time-fit/helper/SurveyResponseHelper';
import AppHelper from '../lib/AppHelper';

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session) {
    return {
      props: {},
    };
  }
  

  const userName = session.user.name;
  const user = await UserInfoHelper.getUserInfoByUsername(userName);
  const userInfo = JSON.parse(JSON.stringify(user, ObjectHelper.convertDateToString));

  const hasFitbitConnection =
    user.fitbitId != undefined &&
    user.accessToken != undefined &&
    user.refreshToken != undefined;

  let isAccessTokenActive = false;

  const introspectResult = await FitbitAPIHelper.introspectToken(
    user.accessToken,
    user.accessToken
  )
    .then((responseData) => {
      isAccessTokenActive = responseData.active == true;
      return responseData;
    })
    .catch((error) => {
      let resultObj = {};
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`Data: ${error.response.data}`);
        console.log(`Status: ${error.response.status}`);
        console.log(`StatusText: ${error.response.statusText}`);
        console.log(`Headers: ${error.response.headers}`);

        console.log(`Error response`);
        resultObj = eval(`(${inspect(error.response.data)})`);
        // which means, authentication falil
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);

        console.log(`Error request`);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log("Error", error.message);

        console.log("Error else");
      }
      //res.status(error.response.status).json({ response: inspect(error.response.data) });

      return { value: "failed", data: resultObj };
    });


  // baseline survey completed
  const isBaselineSurveyCompleted = await SurveyResponseHelper.isSurveyCompletedByPerson("SV_81aWO5sJPDhGZNA", userInfo.username);

  const hostURL = `${process.env.HOST_URL}`;

  return {
    props: {
      userInfo,
      hasFitbitConnection,
      isAccessTokenActive,
      isBaselineSurveyCompleted,
      introspectResult,
      hostURL,
    },
  };
}

export default function Main({
  userInfo,
  hasFitbitConnection,
  isAccessTokenActive,
  isBaselineSurveyCompleted,
  introspectResult,
  hostURL,
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [displaySetting, setDisplaySetting] = useState("all");

  // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
  if (status == "loading") return <div>loading...</div>;

  if (!session) {
    router.push("/");
    return null;
  }

  async function getInfo(
    username
  ) {

    const result = await fetch(
      "/api/user?function_name=get_info",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username: username
        }),
      }
    ).then((r) => {
      return r.json();
    });

    return result;
  }    

  if(!AppHelper.isPreferredNameSet(userInfo)){
    router.push("/info-edit");
    return null;
  }
  else if(!AppHelper.isWakeBedTimeSet(userInfo)){
    router.push("/time-setting");
    return null;
  }
  else if(false && !AppHelper.doesFitbitInfoExist(userInfo)){
    router.push("/fitbit-authorize");
    return null;
  }
  else if(!AppHelper.isFitbitReminderTurnOff(userInfo)){
    router.push("/turn-off-fitbit-reminder");
    return null;
  }
  else if(!AppHelper.isWalkSetTo10(userInfo)){
    router.push("/set-walk-auto-to-10");
    return null;
  }
  else if(!AppHelper.isWalkToJoySaveToContacts(userInfo)){
    router.push("/save-walktojoy-to-contacts");
    return null;
  }

  // Tutorial example: https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=process.env.FITBIT_CLIENT_ID&redirect_uri=https%3A%2F%2Fwalktojoy.info%2Ffitbit-signin&scope=activity%20heartrate%20profile%20settings&expires_in=604800

  // long: activity%20heartrate%20location%20nutrition%20profile%20settings%20sleep%20social%20weight
  // short: activity%20profile%20settings%20


  const fitbitAuthorizeLink = "/fitbit-authorize";


  // https://umich.qualtrics.com/jfe/form/SV_81aWO5sJPDhGZNA?study_code=test4
  const baselineSurveyLink = `https://umich.qualtrics.com/jfe/form/SV_81aWO5sJPDhGZNA?study_code=${userInfo.username}`;


  const handleChange = (event, newSetting) => {
    setDisplaySetting(newSetting);
  };

  const control = {
    value: displaySetting,
    onChange: handleChange,
    exclusive: true,
  };

  const contactUsFormLink = "https://airtable.com/shr5NOZlCG0uBbe2w";

  return (
    <Layout title={"Fitbit Break"} description={""}>
    <div>
          <ToggleButtonGroup {...control} style={{display: "none"}}>
            <ToggleButton value="incomplete" key="incomplete">
              Incomplete
            </ToggleButton>
            <ToggleButton value="all" key="all">
              All
            </ToggleButton>
          </ToggleButtonGroup>
          
          <a href={contactUsFormLink} target="_blank" rel="noreferrer"><img src='/image/svg/circle-question-walktojoy.svg' alt="link to contact us form"/></a>

          <h1 className="project-text">Hi {userInfo.preferredName},</h1>
          <p>
          {
            userInfo.phase == "baseline"? `You are currently in the baseline phase.`: `The study is currently active.` 
          }
          </p>
          <p>
          {
            userInfo.phase == "baseline"? `During this phase, we ask that you:`: `During the 6 weeks of intervention, we ask that you:` 
          }
          </p>
          <p></p>
          <ol>
            <li>Keep your Fitbit authorized, and continue to wear your Fitbit device for at least 8 hours each day.</li>

            {
              userInfo.phase == "baseline"? <li>Complete the Baseline Survey</li>: null 
            }

            {
              userInfo.phase == "intervention"? <li>Continue to wear your Fitbit device for at least 8 hours each day.</li>: null 
            }

            {
              userInfo.phase == "intervention"? <li>Complete all surveys your receive.</li>: null 
            }
            
          </ol>
          <br />
          <br />
          <Fragment>
              <Link href={baselineSurveyLink}>
                <Button 
                variant="contained" 
                  className={isBaselineSurveyCompleted? "project-button-complete": "project-button-incomplete"}
                >
                  {isBaselineSurveyCompleted? `Baseline Survey Completed`:"Complete the Baseline Survey"}
                  
                </Button>
              </Link>
              <br />
              <br />
          </Fragment>
          <Fragment>
              <Link href={fitbitAuthorizeLink}>
                <Button 
                variant="contained" 
                className={AppHelper.doesFitbitInfoExist(userInfo)? "project-button-complete": "project-button-incomplete"}
                  >
                  {AppHelper.doesFitbitInfoExist(userInfo)? "Fitbit Authorized": "Authorize your Fitbit"}
                </Button>
              </Link>
              <br />
              <br />
          </Fragment>
          <Fragment>
              <Link href={"time-zone"}>
                <Button 
                variant="contained" 
                className={"project-button-complete"}
                  >
                  Update timezone
                </Button>
              </Link>
              <br />
              <br />
          </Fragment>

          <p>
          {
            userInfo.phase == "baseline"? `If all the above tasks are completed, you will begin your intervention phase the upcoming Monday.`: null
          }
          </p>
          <p>
          {
            userInfo.phase == "baseline"? `Thank you for your contribution.`: null
          }
          </p>
          <Divider />
          <br />
        </div>
        <div>
          <Button
            variant="outlined"
            color="error"
            style={{ width: "100%" }}
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
    </Layout>

  );
}
