import FitbitUpdateHelper from "@time-fit/fitbit-integration/FitbitUpdateHelper.js";
import NetworkHelper from "@time-fit/helper/NetworkHelper.js";

export default async function handler(req, res) {
  const { verify } = req.query;
  const ip = NetworkHelper.getIPFromRequest(req);

  const validity = verify == process.env.FITBIT_SUBSCRIPTION_VERIFICATION_CODE;

  if (verify != undefined) {
    // should be treated as a verify request
    if (validity) {
      res.status(204).end();
    } else {
      // now a valid verification request
      res.status(404).end();
    }
  } else {
    // is not a verify request
    if (req.body.length > 0) {
      const notificationList = req.body.map((item) => {
        return { ...item, ip, status: "notification" };
      });
      const insertResult = await FitbitUpdateHelper.insertFitbitUpdateList(
        notificationList
      );
      res.status(204).end();
    }
  }
}
