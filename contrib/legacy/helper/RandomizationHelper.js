import seedrandom from 'seedrandom';
import { hrtime } from 'node:process';

export default class RandomizationHelper {
  constructor() {}
  static getRandomNumber(seed) {
    let mySeed = undefined;

    if (seed == undefined) {
      mySeed = hrtime();
    }
    else {
      mySeed = seed;
    }
    return seedrandom(mySeed)();
  }
  static getRandomIntInclusiveRNG(min, max, seed = undefined) {

    let mySeed = undefined;

    if (seed == undefined) {
      mySeed = hrtime();
    }
    else {
      mySeed = seed;
    }
    let rng = seedrandom(mySeed);
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(rng() * (max - min + 1) + min);
  }
}
