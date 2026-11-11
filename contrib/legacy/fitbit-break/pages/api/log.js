import { authOptions } from "./auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import LogHelper from "@time-fit/helper/LogHelper";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).json({});
      res.end();
      return
  }

  const { function_name } = req.query;
  const { type, content } = req.body;

  console.log(`function: ${function_name}`);

  switch (function_name) {
    case "logToDB":
      const aLog = await LogHelper.insertLogList([
        {
          type: type,
          content: content,
        },
      ]);
      res.status(200).json({ result: aLog });
      return;
    default:
      return;
  }
}
