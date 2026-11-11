import UserInfoHelper from "@time-fit/helper/UserInfoHelper.js";
import ObjectHelper from "@time-fit/helper/ObjectHelper.js";

const adminUsernameList = ["test1", "test2", "test3", "test4"];

export default class UserHandler {
  constructor() {}

  static async handleRequest(req, res, session) {
    const { function_name } = req.query;
    console.log(`user - function_name: ${function_name}`);

    let sessionUserName = session.user.name;

    switch (function_name) {
      case "get":
        let itemList = [];
        if (adminUsernameList.includes(sessionUserName)) {
          itemList = await UserInfoHelper.getUsers();
        }
        res.status(200).json({ result: itemList });
        return;
      
      case "update_time_preference":
        const { weekdayWakeup, weekdayBed, weekendWakeup, weekendBed, timezone } = req.body;
        const updateUser = await UserInfoHelper.updateUserInfo(
          { username: sessionUserName },
          {
            weekdayWakeup,
            weekdayBed,
            weekendWakeup,
            weekendBed,
            timezone,
          }
        );
        res.status(200).json({ result: "success" });
        return;

      case "update_group_assignment":
        const { gif, salience, modification } = req.body;
        const updateGroupUser = await UserInfoHelper.updateUserInfo(
          { username: sessionUserName },
          {
            gif,
            salience,
            modification,
          }
        );
        res.status(200).json({ result: "success" });
        return;

      case "update_fitbit_info":
        const { fitbitId, fitbitDisplayName, fitbitFullName } = req.body;
        const updateFitbitUser = await UserInfoHelper.updateUserInfo(
          { username: sessionUserName },
          {
            fitbitId,
            fitbitDisplayName,
            fitbitFullName,
          }
        );
        res.status(200).json({ result: "success" });
        return;

      default:
        res.status(400).json({ error: "Unknown function" });
        return;
    }
  }

  static async getUserList(sessionUserName) {
    let userList = [];
    if (adminUsernameList.includes(sessionUserName)) {
      userList = await UserInfoHelper.getUsers();
    }
    return userList.map(user => ObjectHelper.exclude(user, ["password", "hash", "accessToken", "refreshToken"]));
  }

  static async updateUserPreferences(username, preferences) {
    return await UserInfoHelper.updateUserInfo({ username }, preferences);
  }

  static async updateUserGroup(username, groupAssignment) {
    return await UserInfoHelper.updateUserInfo({ username }, groupAssignment);
  }
}
