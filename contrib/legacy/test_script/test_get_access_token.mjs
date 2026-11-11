"use strict";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const Hapi = require("@hapi/hapi");
const twilio = require("twilio");

const Bell = require("@hapi/bell");
const Wreck = require("wreck");
const path = require("path");
const JWT = require("jwt-simple");
const crypto = require("crypto");

const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

let authCode = process.env.FITBIT_AUTH_CODE;

axios({
  method: 'post',
  baseURL: 'https://api.fitbit.com/',
  url: '/oauth2/token',
  // `headers` are custom headers to be sent
  headers: {
    // now sure where this comes from?
    'Authorization': `Basic ${process.env.FITBIT_AUTH_TOKEN}`,
    'Content-Type':'application/x-www-form-urlencoded'
  },
  params: {
    clientId: process.env.FITBIT_CLIENT_ID,
    grant_type: 'authorization_code',
    redirect_uri: `${process.env.NEXTAUTH_URL}/signin`,
    code: authCode
  }
})
.then(function (response) {
  console.log(response.data);
});
