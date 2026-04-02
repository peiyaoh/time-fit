import FitbitAPIHelper from "./FitbitAPIHelper";
import FitbitCredentialHelper from "./FitbitCredentialHelper";
import { getPrismaClient } from "../../../helper/prisma.js";

export default class FitbitSubscriptionHelper {
  constructor() {}

  static async getSubscriptionList(orderBy = "desc") {
    return await getPrismaClient().fitbit_subscription.findMany({
      orderBy: [
        {
          updatedAt: orderBy,
        },
      ],
    });
  }

  static async createSubscriptionsForUser(
    userInfo,
    collectionTypeList = ["activities", "userRevokedAccess"]
  ) {
    let resultList = [];

    // validate user token first
    // { value: "success", data: userInfo };
    // { value: "failed", data: inspect(error.response.data) };
    const validateTokenResult =
      await FitbitCredentialHelper.ensureTokenValidForUser(
        userInfo,
        true,
        30 * 60
      );
    let updatedUserInfo;

    if (validateTokenResult.value == "success") {
      updatedUserInfo = validateTokenResult.data;
    } else {
      // cannot update userInfo, need to abort
      return resultList;
    }

    for (let i = 0; i < collectionTypeList.length; i++) {
      const cType = collectionTypeList[i];
      // version 2: just id and type
      const newSubscriptionId = `${updatedUserInfo.fitbitId}-${cType}`;

      const subscriptionResult =
        await FitbitAPIHelper.createSubscriptionForFitbitId(
          updatedUserInfo.fitbitId,
          cType,
          newSubscriptionId,
          updatedUserInfo.accessToken
        );

      const { subscriptionId, ...rest } = subscriptionResult;

      // version 2: upsert
      await prisma.fitbit_subscription.upsert({
        where: {
          subscriptionId: subscriptionId,
        },
        update: { ...rest },
        create: subscriptionResult,
      });

      resultList.push(subscriptionResult);
    }

    return resultList;
  }

  static async listSubscriptionsForUser(
    userInfo,
    collectionTypeList = ["activities", "userRevokedAccess"]
  ) {
    let resultList = [];

    // validate user token first
    // { value: "success", data: userInfo };
    // { value: "failed", data: inspect(error.response.data) };
    const validateTokenResult =
      await FitbitCredentialHelper.ensureTokenValidForUser(
        userInfo,
        true,
        30 * 60
      );
    let updatedUserInfo;

    if (validateTokenResult.value == "success") {
      updatedUserInfo = validateTokenResult.data;
    } else {
      // cannot update userInfo, need to abort
      return resultList;
    }

    for (let i = 0; i < collectionTypeList.length; i++) {
      const cType = collectionTypeList[i];

      const subscriptionResult =
        await FitbitAPIHelper.listSubscriptionForFitbitId(
          updatedUserInfo.fitbitId,
          cType,
          updatedUserInfo.accessToken
        );

      resultList.push(subscriptionResult);
    }

    return resultList;
  }
}
