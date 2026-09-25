import ObjectHelper from "@time-fit/helper/ObjectHelper.js";

export default class UserInfoCondition {
  constructor() {}
  
  static async execute(condition, params) {
    const { userInfo, datetime } = params;

    const result = ObjectHelper.isObjectPropertyValueMatched(
      userInfo,
      condition.criteria
    );

    const recordInfo = {
      userInfoPartial: ObjectHelper.extractObjectPropertyValueMatched(
        userInfo,
        condition.criteria
      ),
    };

    return {
      result,
      recordInfo,
    };
  }
}
