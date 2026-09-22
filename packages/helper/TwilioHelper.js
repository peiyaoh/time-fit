import Twilio from "twilio";

export default class TwilioHelper {
  constructor() {}

  static async sendMessage(
    to,
    bodyMessage,
    mediaUrlList = ["https://demo.twilio.com/owl.png"]
  ) {
    const client = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const message = await client.messages.create({
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        body: bodyMessage,
        mediaUrl: mediaUrlList,
        to,
      });

      return { sid: message.sid, status: message.status };
    } catch (error) {
      return error;
    }
  }
}
