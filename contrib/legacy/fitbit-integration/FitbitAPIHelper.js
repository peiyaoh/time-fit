// TO DO: use fetch instead of axios
import axios from "axios";

const basicToken = process.env.FITBIT_AUTH_TOKEN;

export default class FitbitAPIHelper {

  static FITBIT_INTRADAY_DATA_TYPE_ACTIVITY_SUMMARY = "activity-summary";
  static FITBIT_INTRADAY_DATA_TYPE_HEART = "activity-heart";
  static FITBIT_INTRADAY_DATA_TYPE_STEP = "activity-step";


  constructor() {}

  static async getAuthorizationInformation(authCode) {
    return axios({
      method: "post",
      url: "https://api.fitbit.com/oauth2/token",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: {
        clientId: process.env.FITBIT_CLIENT_ID,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/fitbit-signin`,
        code: authCode,
      },
    }).then((response) => {

      console.log(response.status);
      console.log(response.statusText);
      const data = response.data;
      return data;
    });
  }

  static async getProfile(accessToken) {
    console.log(`${this.name}.getProfile: accessToken: ${accessToken}`);
    return axios({
      method: "get",
      url: `https://api.fitbit.com/1/user/-/profile.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      //data: {}
    }).then((response) => {
      const profileData = response.data;

      return profileData;
    });
  }

  static async refreshToken(refreshToken) {
    return axios({
      method: "post",
      url: `https://api.fitbit.com/oauth2/token`,
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: `application/json`,
      },
      params: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    }).then((response) => {
      const responseData = response.data;

      return responseData;
    });
  }

  static async introspectToken(accessToken, inspectToken) {
    return axios({
      method: "post",
      url: `https://api.fitbit.com/1.1/oauth2/introspect`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Content-Type: application/x-www-form-urlencoded
        Accept: `application/json`,
        "Content-Type": `application/x-www-form-urlencoded`,
      },
      /*
        params: {
          'token': inspectToken
        },
        */
      // Note, the {'token': inspectToken} approach won't work!
      data: `token=${inspectToken}`, //{'Token': inspectToken}
    }).then((response) => {
      const responseData = response.data;
      return responseData;
    });
  }

  static async myIntrospectToken(accessToken, inspectToken) {
    const introspectTokenResult = await FitbitAPIHelper.introspectToken(
      accessToken,
      inspectToken
    )
    .then((responseData) => {
        return {type: "response", result: responseData};
      })
      .catch((error) => {
        return {type: "error", result: error};
      });
    
    return introspectTokenResult;
  }

  static async createSubscriptionForFitbitId(
    fitbitId,
    collectionPath,
    subscriptionId,
    accessToken
  ) {
    return axios({
      method: "post",
      url: `https://api.fitbit.com/1/user/${fitbitId}/${collectionPath}/apiSubscriptions/${subscriptionId}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
    }).then((response) => {
      const responseData = response.data;
      return responseData;
    })
    .catch((error) => {
      // handle error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);

        if(error.response.status == "409"){
          return error.response.data;
        }


      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
    });
  }

  static async getActivityGoalsForFitbitID(encodedId, accessToken, periodString="daily") {
    console.log(
      `${this.name}.getActivityGoalsForFitbitID: fitbitId: ${encodedId}, accessToken: ${accessToken}, periodString: ${periodString}`
    );

    // example response for daily goals
    // reference: https://dev.fitbit.com/build/reference/web-api/activity/get-activity-goals/

    /*
    {
      "goals": {
          "activeMinutes": 55,
          "activeZoneMinutes": 21,
          "caloriesOut": 3500,
          "distance": 5,
          "floors": 10,
          "steps": 10000
      }
    }
    */

    return axios({
      method: "get",
      url: `https://api.fitbit.com/1/user/${encodedId}/activities/goals/${periodString}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      //data: {}
    }).then((response) => {
      return response.data;
    });
  }

  static async setActivityGoalsForFitbitID(encodedId, accessToken, periodString="daily", type="steps", targetGoalValue=0) {
    console.log(
      `${this.name}.setActivityGoalsForFitbitID: fitbitId: ${encodedId}, accessToken: ${accessToken}, periodString: ${periodString}, type: ${type}, targetGoalValue: ${targetGoalValue}`
    );

    // example response for daily goals
    // reference: https://dev.fitbit.com/build/reference/web-api/activity/get-activity-goals/

    /*
    {
      "goals": {
          "activeMinutes": 55,
          "activeZoneMinutes": 21,
          "caloriesOut": 3500,
          "distance": 5,
          "floors": 10,
          "steps": 10000
      }
    }
    */

    // ${encodedId}
    return axios({
      method: "post",
      url: `https://api.fitbit.com/1/user/${encodedId}/activities/goals/${periodString}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      // see if this works
      params: {
        type: type,
        value: targetGoalValue
      },
      //data: {}
    }).then((response) => {
      console.log(`request: ${JSON.stringify(response.requeest)}`);
      return response.data;
    });
  }

  static async getActvitySummaryAtDateForFitbitId(encodedId, accessToken, dateTime) {
    console.log(
      `${this.name}.getActvitySummaryAtDateForFitbitId: fitbitId: ${encodedId}, accessToken: ${accessToken}, dateTime: ${dateTime.toISODate()}`
    );
    return axios({
      method: "get",
      url: `https://api.fitbit.com/1/user/${encodedId}/activities/date/${dateTime.toISODate()}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      //data: {}
    }).then((response) => {
      return response.data;
    });
  }

  static async getHeartRateAtDateForFitbitId(encodedId, accessToken, dateTime, period="1d") {
    console.log(
      `${this.name}.getHeartRateAtDateForFitbitId: fitbitId: ${encodedId}, accessToken: ${accessToken}, dateTime: ${dateTime.toISODate()}`
    );
    return axios({
      method: "get",
      url: `https://api.fitbit.com/1/user/${encodedId}/activities/heart/date/${dateTime.toISODate()}/${period}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      //data: {}
    }).then((response) => {
      return response.data;
    });
  }

  static async getIntradayDataBetweenDateRangeForFitbitId(encodedId, fitbitIntradayDataType, accessToken, dateTimeStart, dateTimeEnd, detailLevel="1min") {
    console.log(
      `${this.name}.getIntradayDataBetweenDateRangeForFitbitId: fitbitId: ${encodedId}, type: ${fitbitIntradayDataType}, accessToken: ${accessToken}, dateTimeStart: ${dateTimeStart.toISODate()}, dateTimeEnd: ${dateTimeEnd.toISODate()}`
    );

    // for heart
    // /1/user/[user-id]/activities/heart/date/[start-date]/[end-date]/[detail-level].json

    // /1/user/[user-id]/activities/heart/date/[start-date][end-date]/[detail-level]/time/[start-time]/[end-time].json

    // for step
    // /1/user/[user-id]/activities/[resource]/date/[start-date]/[end-date]/[detail-level].json

    // /1/user/[user-id]/activities/[resource]/date/[start-date][end-date]/[detail-level]/time/[start-time]/[end-time].json

    let endpointURL = "";

    if (fitbitIntradayDataType == FitbitAPIHelper.FITBIT_INTRADAY_DATA_TYPE_HEART){
      endpointURL = `https://api.fitbit.com/1/user/${encodedId}/activities/heart/date/${dateTimeStart.toISODate()}/${dateTimeEnd.toISODate()}/${detailLevel}.json`;
    }
    else if (fitbitIntradayDataType == FitbitAPIHelper.FITBIT_INTRADAY_DATA_TYPE_STEP){
      endpointURL = `https://api.fitbit.com/1/user/${encodedId}/activities/steps/date/${dateTimeStart.toISODate()}/${dateTimeEnd.toISODate()}/${detailLevel}.json`;
    }

    return axios({
      method: "get",
      url: endpointURL,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      //data: {}
    }).then((response) => {
      return response.data;
    });
  }

  

  static async createSubscriptionForFitbitId(
    fitbitId,
    collectionPath,
    subscriptionId,
    accessToken
  ) {
    console.log(
      `${this.name}.createSubscriptionForFitbitId: fitbitId: ${fitbitId}, collectionPath: ${collectionPath}, subscriptionId: ${subscriptionId}, accessToken: ${accessToken}`
    );
    // /1/user/[user-id]/[collection-path]/apiSubscriptions/[subscription-id].json

    return axios({
      method: "post",
      url: `https://api.fitbit.com/1/user/${fitbitId}/${collectionPath}/apiSubscriptions/${subscriptionId}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      /*
      params: {
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
      }
      */
      //data: {}
    }).then((response) => {
      let responseData = response.data;

      console.log(`responseData: ${responseData}`);

      return responseData;
    })
    .catch((error) => {
      // handle error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);

        if(error.response.status == "409"){
          return error.response.data;
        }


      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
    });
  }

  static async listSubscriptionForFitbitId(
    fitbitId,
    collectionPath,
    accessToken
  ) {
    console.log(
      `${this.name}.listSubscriptionForFitbitId: fitbitId: ${fitbitId}, collectionPath: ${collectionPath}, accessToken: ${accessToken}`
    );
    // /1/user/[user-id]/[collection-path]/apiSubscriptions.json

    return axios({
      method: "post",
      url: `https://api.fitbit.com/1/user/${fitbitId}/${collectionPath}/apiSubscriptions.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      /*
      params: {
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
      }
      */
      //data: {}
    }).then((response) => {
      let responseData = response.data;

      return responseData;
    });
  }

  static async getActvitySummaryForProfile(profileData, accessToken, dateTime) {
    console.log(
      `${this.name}.getActvitySummaryForProfile: profileData: ${JSON.stringify(
        profileData
      )}, accessToken: ${accessToken}`
    );
    return axios({
      method: "get",
      url: `https://api.fitbit.com/1/user/${
        profileData.user.encodedId
      }/activities/date/${dateTime.toISODate()}.json`,
      // `headers` are custom headers to be sent
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/json`,
      },
      //data: {}
    }).then((response) => {
      let activitySummaryData = response.data;

      return activitySummaryData;
    });
  }
}