export default class ObjectHelper {
  constructor() {}

  static exclude(item, keyList) {
    const result = { ...item };
    for (let key of keyList) {
      delete result[key];
    }
    return result;
  }

  static isPropertySet(object, propertyName) {
    if (object == null) {
      return false;
    }
    return object[propertyName] != undefined;
  }

  static isObjectPropertyValueMatched(object, propertyValueObject) {
    let result = true;

    Object.keys(propertyValueObject).forEach((propertyName) => {
      if (
        object[propertyName] !== null &&
        typeof propertyValueObject[propertyName] === "object"
      ) {
        result =
          result &&
          ObjectHelper.isObjectPropertyValueMatched(
            object[propertyName],
            propertyValueObject[propertyName]
          );
      } else {
        if (object[propertyName] !== propertyValueObject[propertyName]) {
          result = false;
        }
      }
    });

    return result;
  }

  static extractObjectPropertyValueMatched(object, propertyValueObject) {
    let resultInfo = {};

    Object.keys(propertyValueObject).forEach((propertyName) => {
      resultInfo[propertyName] = object[propertyName];
    });

    return resultInfo;
  }

  static convertDateToString(key, value) {

    if (typeof value === "Date") {
      return value.toString();
    }
    
    return value;
  }
}
