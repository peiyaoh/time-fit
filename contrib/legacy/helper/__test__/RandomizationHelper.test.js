import RandomizationHelper from "../RandomizationHelper";

describe('randomization number', () => {
  test('getRandomNumber() value is within [0,1)', () => {
    // obtain 100 random numbers and check if all of them fall into [0,1)
    let randomNumberList1 = [];
    for (let i = 0; i < 100; i++) {
      const randomNumber = RandomizationHelper.getRandomNumber();
      randomNumberList1.push(randomNumber);
      expect(randomNumber).toBeGreaterThanOrEqual(0);
      expect(randomNumber).toBeLessThan(1);
    }


    // obtain another 100 random numbers and check that they are different from the previous 100
    let randomNumberList2 = [];
    for (let i = 0; i < 100; i++) {
      const randomNumber = RandomizationHelper.getRandomNumber();
      randomNumberList2.push(randomNumber);
    }

    let isDifferent = false;
    for (let i = 0; i < 100; i++) {
      if (randomNumberList1[i] != randomNumberList2[i]) {
        isDifferent = true;
        break;
      }
    }
    expect(isDifferent).toBe(true);

  });


  test('getRandomIntInclusiveRNG() value is within [0,1]', () => {
    // obtain 100 random numbers and check if all of them fall into [0,1)
    let randomNumberList1 = [];
    for (let i = 0; i < 100; i++) {
      const randomNumber = RandomizationHelper.getRandomIntInclusiveRNG(0, 1);
      randomNumberList1.push(randomNumber);
      expect(randomNumber).toBeGreaterThanOrEqual(0);
      expect(randomNumber).toBeLessThanOrEqual(1);
    }


    // obtain another 100 random numbers and check that they are different from the previous 100
    let randomNumberList2 = [];
    for (let i = 0; i < 100; i++) {
        const randomNumber = RandomizationHelper.getRandomIntInclusiveRNG(0, 1);
      randomNumberList2.push(randomNumber);
    }

    let isDifferent = false;
    for (let i = 0; i < 100; i++) {
      if (randomNumberList1[i] != randomNumberList2[i]) {
        isDifferent = true;
        break;
      }
    }
    expect(isDifferent).toBe(true);

  });

});