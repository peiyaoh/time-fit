import Layout from "../component/Layout";
import md5 from "md5";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import Button from '@mui/material/Button';
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import ObjectHelper from "@time-fit/helper/ObjectHelper";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import AppHelper from "../lib/AppHelper";

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session) {
    return {
      props: {userInfo:{}},
    };
  }

  const userName = session.user.name;

  const uniqueUser = await UserInfoHelper.getUserInfoByUsername(userName);
  const userInfo = JSON.parse(JSON.stringify(uniqueUser, ObjectHelper.convertDateToString));

  const hostURL = `${process.env.HOST_URL}`;

  return {
    props: { userInfo, hostURL },
  };
}

export default function FitbitAuthorize({ userInfo, hostURL }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // status: enum mapping to three possible session states: "loading" | "authenticated" | "unauthenticated"
  if (status == "loading") return <div>loading...</div>;

  if (!session) {
    router.push("/");
    return null;
  }

  const redirectURL = `${hostURL}/fitbit-signin`;

  const state = `auth-fitbitbreak-${md5(session.user.name)}`;

  const scope = ["activity", "heartrate", "profile", "settings"].join("%20");
  
  const fitbitSignInLink = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${process.env.FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectURL
  )}&state=${state}&scope=${scope}&expires_in=604800`;

  return (
    <Layout title={"Authorize your Fitbit"} description={""}>
        <h1 className="project-text">Authorize your Fitbit</h1>
        <div>
        <Link href={fitbitSignInLink} passHref>
              <Button 
                className="project-button"
                variant="contained" 
                color={AppHelper.doesFitbitInfoExist(userInfo)? "success":"primary"}>
                Authorize your Fitbit
              </Button>
            </Link>
          <br />
          <br />
          <p>Please do not change your Fitbit device or account during the study.</p>
        </div>
    </Layout>
  );
}
