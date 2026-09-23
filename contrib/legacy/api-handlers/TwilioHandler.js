import TwilioHelper from "@time-fit/helper/TwilioHelper.js";

export default class TwilioHandler {
  constructor() {}

  static async handleRequest(req, res) {
    const { function_name } = req.query;
    
    console.log(`twilio - function: ${function_name}`);

    switch (function_name) {
      case "send_message":
        const { phone, messageBody, mediaUrlList } = req.body;
        console.log(`send_message: phone: ${phone}, messageBody: ${messageBody}, mediaUrlList: ${mediaUrlList}`);
        
        const result = await TwilioHelper.sendMessage(phone, messageBody, mediaUrlList || []);
        res.status(200).json({ result });
        return;
      
      default:
        res.status(400).json({ error: "Unknown function" });
        return;
    }
  }

  static async sendMessage(phone, messageBody, mediaUrlList = []) {
    return TwilioHelper.sendMessage(phone, messageBody, mediaUrlList);
  }

  static validatePhoneNumber(phone) {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeMessage(message) {
    // Basic message sanitization
    return message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
}
