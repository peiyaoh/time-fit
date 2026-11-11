
import { authOptions } from "./auth/[...nextauth]";
import { getServerSession } from "next-auth";
import NetworkHelper from "@time-fit/helper/NetworkHelper";
import AppHelper from "../../lib/AppHelper.js"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

    const isLocal = NetworkHelper.isRequestFromLocalhost(req);
    
    if (!isLocal && !session) {
      res.status(401).json({});
      res.end();
      return
    }
    

    const { function_name } = req.query;
    
    switch (function_name) {
        case "compose_message":
            const {userInfo, messageInfo, surveyURL} = req.body;
            let message = await AppHelper.composeUserMessageForTwilio(userInfo, messageInfo, surveyURL);
            res.status(200).json({ result: message });
            return;
        default:
            res.status(401).json({});
            res.end();
            return;
    }
}
