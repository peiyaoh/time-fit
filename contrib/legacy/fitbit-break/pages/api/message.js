
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import MessageHelper from "@time-fit/helper/MessageHelper";

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
    if (!session) {
        res.status(401).json({});
        res.end();
        return
    }

    const userName = session.user.name;

    const { function_name } = req.query;

    switch (function_name) {
        case "get":
            let itemList = [];

            if (adminUsernameList.includes(userName)) {
                itemList = await MessageHelper.getMessagesSortedByUpdatedAt("desc");
            }
            res.status(200).json({ result: itemList });
            return;
        default:
            return;
    }
}