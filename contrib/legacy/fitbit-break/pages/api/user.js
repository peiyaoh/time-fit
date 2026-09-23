import { authOptions } from "./auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { UserHandler } from "@time-fit/api-handlers";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  console.log(`user - session: ${JSON.stringify(session)}`);
  if (!session) {
    res.status(401).json({});
    res.end();
    return;
  }

  // Use the new UserHandler
  return UserHandler.handleRequest(req, res, session);
}
