import seedrandom from 'seedrandom';
import { hrtime } from 'node:process';

export default class NoAction {
  constructor() {}
  static async execute(actionInfo, params) {
    return {
        type: "no-action",
        value: {
          status: "success",
          errorMessage: "",
          body: {},
        },
      };
  }
}
