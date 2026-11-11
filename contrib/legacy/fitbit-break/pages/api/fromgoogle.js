import SurveyResponseHelper from "@time-fit/helper/SurveyResponseHelper.js";

export default async function handler(req, res) {
    const aResponse = await SurveyResponseHelper.insertSurveyResponseList([req.body]);
    res.status(200).json({ result: aResponse });
}
  