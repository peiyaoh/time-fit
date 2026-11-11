import MailjetHelper from "@time-fit/helper/MailjetHelper";

export default class MailjetEmailAction {
  emailInfo;

  constructor(emailInfo) {
    this.emailInfo = emailInfo;
  }

  async execute(actionInfo, params) {
    const { userInfo, datetime } = params;

    const emailInfo = actionInfo.emailInfo
      ? actionInfo.emailInfo
      : this.emailInfo;

    const result = await MailjetHelper.sendEmail([emailInfo]);

    return {
      type: "mailjet-email",
      value: result,
    };
  }
}
