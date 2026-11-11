import DesktopNotificationHelper from "@time-fit/helper/DesktopNotificationHelper.js";

export default class DesktopNotificationAction {
  #title="TimeFit";
  #message="Hello, this is a test notification.";

  constructor(title, message) {
    this.#title = title;
    this.#message = message;
  }

  async execute(actionInfo, params) {
    const { userInfo, datetime } = params;

    const result = await DesktopNotificationHelper.sendNotification(
      this.#title,
      this.#message
    );

    return {
      type: "desktop-notification",
      value: result,
    };
  }
}
