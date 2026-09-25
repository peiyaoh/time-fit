import Mailjet from "node-mailjet";
import { inspect } from "util";

export default class MailjetHelper {
  constructor() {}

  static async sendEmail(emailInfoList) {
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    let unifiedResponse = {
      type: "default type",
      status: -1,
      statusText: "default status",
      message: "default message",
      headers: {},
      config: {},
      request: {},
      body: {},
    };

    try {
      const result = await mailjet.post("send", { version: "v3.1" }).request({
        Messages: emailInfoList,
      });
      unifiedResponse.type = "response";
      unifiedResponse.status = result.response.status;
      unifiedResponse.statusText = result.response.statusText;
      unifiedResponse.headers = result.response.headers;
      unifiedResponse.config = result.response.config;
      unifiedResponse.body = result.body;
    } catch (error) {
      unifiedResponse.type = "error";
      unifiedResponse.message = inspect(error);
    }

    return unifiedResponse;
  }
}
