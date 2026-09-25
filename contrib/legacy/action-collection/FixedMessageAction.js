export default class FixedMessageAction {
message = "";
  constructor(msg) {
    this.message = msg;
  }
  async execute(actionInfo, params) {
    return {
      type: "console",
      value: FixedMessageAction.message,
    };
  }
}
