import BooleanHelper from "../BooleanHelper";

describe('BooleanHelper', () => {
  test('and works', () => {
    const result = BooleanHelper.reduceBooleanArray([true, true, true], "and");
    expect(result).toBe(true);

    const result2 = BooleanHelper.reduceBooleanArray([true, false, true], "and");
    expect(result2).toBe(false);
  });

  test('or works', () => {
    const result = BooleanHelper.reduceBooleanArray([true, true, true], "or");
    expect(result).toBe(true);

    const result2 = BooleanHelper.reduceBooleanArray([true, false, true], "or");
    expect(result2).toBe(true);
  });

  test('not any works', () => {
    const result = BooleanHelper.reduceBooleanArray([true, true, true], "not any");
    expect(result).toBe(false);

    const result2 = BooleanHelper.reduceBooleanArray([true, false, true], "not any");
    expect(result2).toBe(false);

    const result3 = BooleanHelper.reduceBooleanArray([false, false, false], "not any");
    expect(result3).toBe(true);
  });
  

});