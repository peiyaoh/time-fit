import seedrandom from 'seedrandom';
import { hrtime } from 'node:process';

export default class HelloAction {
  constructor() {}
  static async execute(actionInfo, params) {
    console.log(`Hello, ${params.userInfo.username}!`);

    return {
        type: "console",
        value: "hello",
    };
  }
}
