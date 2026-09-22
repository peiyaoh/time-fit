import { inspect } from 'util';
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import FitbitHelper from "@time-fit/fitbit-integration/FitbitHelper.js";

export default async function handler(req, res) {
  const { code, state } = req.query;
  //const { type, content } = req.body;

  console.log(`authCode: ${code}`);
  console.log(`state: ${state}`);

  async function updateToken(hashCode, accessToken, refreshToken) {
    console.log(`updateToken, hashCode: ${hashCode}`);
    console.log(`updateToken, accessToken: ${accessToken}`);
    console.log(`updateToken, refreshToken: ${refreshToken}`);

    const updateUser = await UserInfoHelper.updateUserInfoByPropertyValue("hash", hashCode, {
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }

  const authCode = code;
  const stateSplit = state.split("-");
  const hashCode = stateSplit[2];

  const user = await UserInfoHelper.getUserInfoByPropertyValue("hash", hashCode);

  return FitbitHelper.getAuthorizationInformation(authCode)
    .then((responseData) => {
      const accessToken = responseData.access_token;
      const refreshToken = responseData.refresh_token;
      updateToken(hashCode, accessToken, refreshToken);
      res.status(200).json({ message: "authentication success" });
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
      res
        .status(error.response.status)
        .json({ response: inspect(error.response.data) });
    });
}
