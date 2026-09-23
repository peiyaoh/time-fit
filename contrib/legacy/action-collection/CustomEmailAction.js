import MailjetHelper from "@time-fit/helper/MailjetHelper";
import MJMLHelper from "@time-fit/helper/MJMLHelper";

export default class CustomEmailAction extends MailJetEmailAction {
  emailInfo = {
    "From": {
        "Email": `no-reply@timefit.org`,
        "Name": "Fitbit Break",
    },
    "Headers": { 'Reply-To': "timefit.notify@umich.edu" },
    "To": [
        {
            "Email": "[userInfo.email]",
            "Name": "[userInfo.preferredName]"
        }
    ],
    "Cc": [],
    "Subject": "",
    "TextPart": "",
    "HTMLPart": "",
    "CustomID": "FitbitBreak"
  };

  constructor(emailInfo) {
    super();
    if (emailInfo) {
      this.emailInfo = emailInfo;
    }
  }

  async execute(actionInfo, params) {
    const { userInfo, datetime } = params;

    let myEmailInfo = JSON.parse(JSON.stringify(this.emailInfo));

    myEmailInfo.To[0].Email = userInfo.email;
    myEmailInfo.To[0].Name = userInfo.preferredName;
    myEmailInfo.Subject = `[Fitbit Break] ${datetime}`;

    myEmailInfo.TextPart = actionInfo.message;

    let mjmlSectionList = [];
    let mjmlSection = "";

    mjmlSection = MJMLHelper.getMJMLTextSection(actionInfo.params.message);
    mjmlSectionList.push(mjmlSection);

    const htmlString = MJMLHelper.getHTMLFromMJMLSectionList(mjmlSectionList).html;
    myEmailInfo.HTMLPart = htmlString;


    const result = await MailjetHelper.sendEmail([myEmailInfo]);

    return {
      type: "custom-email",
      value: result,
    };
  }
}
