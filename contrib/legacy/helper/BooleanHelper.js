export default class BooleanHelper {
  constructor() {}
  static reduceBooleanArray(bArray, operator) {
    let result = true;

    const initialValue = bArray.length > 0 ? bArray[0] : false;

    switch (operator) {
      case "and":
        result = bArray.reduce(
          (previousValue, currentValue) => previousValue && currentValue,
          initialValue
        );
        break;
      case "or":
        result = bArray.reduce(
          (previousValue, currentValue) => previousValue || currentValue,
          initialValue
        );
        break;
      case "not any":
        result = !bArray.reduce(
          (previousValue, currentValue) => previousValue || currentValue,
          initialValue
        );
        break;
      default:
        break;
    }

    return result;
  }
}
