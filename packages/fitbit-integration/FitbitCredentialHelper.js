import { DateTime } from "luxon";
import UserInfoHelper from "../../../helper/UserInfoHelper";
import FitbitAPIHelper from "./FitbitAPIHelper";
import { inspect } from "util";

export default class FitbitCredentialHelper {
  constructor() {}

  static async ensureTokenValidForUser(
    userInfo,
    autoRefresh = false,
    minValidthresholdInSeconds = 8 * 60 * 60
  ) {
    // version 2: myIntrospectToken
    /*
        return {type: "response", result: responseData};
        return {type: "error", result: error};
        */
    let introspectResult = undefined;

    const myIntrospectResult = await FitbitAPIHelper.myIntrospectToken(
      userInfo.accessToken,
      userInfo.accessToken
    );

    if (myIntrospectResult.type == "response") {
      introspectResult = myIntrospectResult.result;
    } else {
      // unhandledRejection: Error: Request failed with status code 401
      // need to refresh then
    }

    if (introspectResult != undefined && introspectResult.active == true) {
      const expiredDate = DateTime.fromMillis(introspectResult["exp"]);
      const nowDate = DateTime.now();

      const diffInSeconds = expiredDate.diff(nowDate, "seconds").toObject()[
        "seconds"
      ];

      // token is still valid
      if (autoRefresh == false) {
        return { value: "success", data: userInfo };
      } else {
        if (diffInSeconds > minValidthresholdInSeconds) {
          return { value: "success", data: userInfo };
        } else {
          return { value: "failed", data: introspectResult };
        }
      }
    }

    // accessToken is not valid
    // or, diffInSeconds is small than the minimum tolerable threshold (too close to the expire time)
    const refreshResult = await FitbitAPIHelper.refreshToken(userInfo.refreshToken)
      .then((responseData) => {

        const newAccessToken = responseData.access_token;

        // If you followed the Authorization Code Flow, you were issued a refresh token. You can use your refresh token to get a new access token in case the one that you currently have has expired. Enter or paste your refresh token below. Also make sure you enteryour data in section 1 and 3 since it's used to refresh your access token.
        const newRefreshToken = responseData.refresh_token;

        return {
          value: "success",
          data: {
            ...userInfo,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        };

        //res.status(200).json({ message: "authentication success" });
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

        return { value: "failed", data: inspect(error.response.data) };
      });

    if (refreshResult.value == "success") {
      // need to actually update the token
      let updatedUserInfo = await UserInfoHelper.updateToken(
        userInfo.hash,
        refreshResult.data.accessToken,
        refreshResult.data.refreshToken,
        userInfo
      );

      return { value: "success", data: updatedUserInfo };
    }

    return refreshResult;
  }
}
