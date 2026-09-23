import styles from "../styles/Home.module.css";
import Layout from "../component/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import LinearProgress from "@mui/material/LinearProgress";
import Button from "@mui/material/Button";
import FitbitHelper from "@time-fit/fitbit-integration/FitbitHelper.js";
import { inspect } from "util";
import { Fragment } from "react";

import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import FitbitAPIHelper from "@time-fit/fitbit-integration/FitbitAPIHelper.js";


export async function getServerSideProps({ query }) {
  const { code, state } = query;

  const authCode = code;
  const stateSplit = state.split("-");
  const hashCode = stateSplit[2];

  async function updateToken(hashCode, accessToken, refreshToken) {
    const firstUser = await UserInfoHelper.getUserInfoByPropertyValue(
      "hash",
      hashCode
    );

    const updateUser = await UserInfoHelper.updateUserInfo(firstUser, {
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }

  async function updateFitbitProfile(
    hashCode,
    fitbitId,
    fitbitDisplayName,
    fitbitFullName
  ) {
    const firstUser = await UserInfoHelper.getUserInfoByPropertyValue(
      "hash",
      hashCode
    );

    const updateUser = await UserInfoHelper.updateUserInfo(firstUser, {
      fitbitId: fitbitId,
      fitbitDisplayName: fitbitDisplayName,
      fitbitFullName: fitbitFullName,
    });
  }

  async function updateFitbitProfile(
    hashCode,
    fitbitId,
    fitbitDisplayName,
    fitbitFullName
  ) {
    const firstUser = await UserInfoHelper.getUserInfoByPropertyValue(
      "hash",
      hashCode
    );

    const updateUser = await UserInfoHelper.updateUserInfo(firstUser, {
      fitbitId: fitbitId,
      fitbitDisplayName: fitbitDisplayName,
      fitbitFullName: fitbitFullName,
    });
  }

  const user = await UserInfoHelper.getUserInfoByPropertyValue(
    "hash",
    hashCode
  );

  let accessToken = "";
  let refreshToken = "";

  const authResult = await FitbitAPIHelper.getAuthorizationInformation(authCode)
    .then((responseData) => {
      accessToken = responseData.access_token;

      // If you followed the Authorization Code Flow, you were issued a refresh token. You can use your refresh token to get a new access token in case the one that you currently have has expired. Enter or paste your refresh token below. Also make sure you enteryour data in section 1 and 3 since it's used to refresh your access token.
      refreshToken = responseData.refresh_token;

      // To Do: ideally, store both
      updateToken(hashCode, accessToken, refreshToken);

      return { value: "success", stage: "authentication" };
    })
    .catch((error) => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`Data: ${error.response.data}`);
        console.log(`Status: ${error.response.status}`);
        console.log(`StatusText: ${error.response.statusText}`);
        console.log(`Headers: ${error.response.headers}`);

        console.log(`Error response`);
        // which means, authentication falil
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);

        console.log(`Error request`);
      } else {
        // Something happened in setting up the request that triggered an Error
        // console.log('Error', error.message);

        console.log("Error else");
      }
      //res.status(error.response.status).json({ response: inspect(error.response.data) });

      return {
        value: "failed",
        stage: "authentication",
        data: inspect(error.response.data),
      };
    });

  let fitbitId = "";

  const profileResult = await FitbitAPIHelper.getProfile(accessToken)
    .then((responseData) => {
      const rUser = responseData.user;

      const fId = rUser.encodedId;
      fitbitId = fId;
      const fDisplayName = rUser.displayName;
      const fFullName = rUser.fullName;

      updateFitbitProfile(hashCode, fId, fDisplayName, fFullName);

      return { value: "success", stage: "profile" };
    })
    .catch((error) => {
      console.log(error);
      return { value: "failed", stage: "profile" };
    });

  return {
    props: { result: { authResult, profileResult }, fitbitId },
  };
}

export default function FitbitSignin({ result, fitbitId }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isFitbitLoading, setFitbitLoading] = useState(false);

  useEffect(() => {
    setFitbitLoading(true);
    fetch(
      "/api/manage-fitbit-subscription?function_name=create_subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fitbitId: fitbitId,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setFitbitLoading(false);
      });
  }, []);

  if (status == "loading") return <div>loading...</div>;
  if (!session) {
    router.push("/");
    return null;
  }

  const combinedResult =
    result.authResult.value == "success" &&
    result.profileResult.value == "success";

  if (!combinedResult) {
    let message = "";

    if (result.authResult.value == "failed") {
      message += "Fail to authenticate!\n";
    }

    if (result.profileResult.value == "failed") {
      message += "Fail to retrieve profile information.!\n";
    }
  }

  return (
    <Layout title={"Fitbit Break"} description={""}>
      <div>
        {combinedResult ? (
          <h1 className={styles.title}>Fitbit authorized success!</h1>
        ) : (
          <h1 className={styles.title}>Fitbit connection failed!</h1>
        )}
      </div>
      <div>{!combinedResult ? <div>{message}</div> : null}</div>

      <div>
        {isFitbitLoading ? (
          <Fragment>
            <div>Give us a few seconds to wrap things up!</div>
            <LinearProgress></LinearProgress>
          </Fragment>
        ) : null}
      </div>

      <Button
        variant="contained"
        className="project-button"
        disabled={isFitbitLoading}
        onClick={(event) => {
          router.push("/main");
          return;
        }}
      >
        Done
      </Button>
    </Layout>
  );
}
