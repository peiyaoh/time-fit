import { TwilioHandler } from "@time-fit/api-handlers";

export default async function handler(req, res) {
    return TwilioHandler.handleRequest(req, res);
}
