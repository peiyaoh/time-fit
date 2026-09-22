import { authOptions } from "./auth/[...nextauth]";
import { getServerSession } from "next-auth";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper";
import FitbitSubscriptionHelper from "@time-fit/fitbit-integration/FitbitSubscriptionHelper.js";


export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({});
    res.end();
    return;
  }

  const { function_name } = req.query;
  switch (function_name) {
    case "create_subscriptions":
      const { fitbitId } = req.body;
      const firstUser = await UserInfoHelper.getUserInfoByPropertyValue(
        "fitbitId",
        fitbitId
      );

      const resultPromise = await FitbitSubscriptionHelper.createSubscriptionsForUser(
        firstUser
      );
      res.status(200).json({ result: resultPromise });
      return;
    default:
      return;
  }
}
