import ObjectHelper from "./ObjectHelper.js";
import { getPrismaClient } from "@time-fit/database/prisma.js";
export default class UserInfoHelper {
  constructor() {}

  static async getUsers() {
    return await getPrismaClient().users.findMany();
  }

  static async myGetUserList() {
    const users = await UserInfoHelper.getUsers();
    const userList = users.map((userInfo) => {
      return ObjectHelper.exclude(userInfo, [
        "password",
        "hash",
        "accessToken",
        "refreshToken",
      ]);
    });
    return userList;
  }

  static async getUserInfoByUsername(username) {
    return await UserInfoHelper.getUserInfoByPropertyValue(
      "username",
      username
    );
  }

  static async getUserInfoByPropertyValue(property, value) {
    const theUser = await getPrismaClient().users.findFirst({
      where: {
        [property]: value,
      },
    });
    return theUser;
  }

  static extractUserInfoCache(userInfo) {
    const { id, password, hash, accessToken, refreshToken, ...rest } = userInfo;
    return { ...rest };
  }

  static async updateUserInfo(userInfo, propertyValueObject) {
    return await UserInfoHelper.updateUserInfoByPropertyValue(
      "username",
      userInfo.username,
      propertyValueObject
    );
  }

  static async updateUserInfoByPropertyValue(
    property,
    value,
    propertyValueObject
  ) {
    const updateResult = await getPrismaClient().users.update({
      where: {
        [property]: value,
      },
      data: {
        ...propertyValueObject,
      },
    });

    return updateResult;
  }

  static async updateToken(
    hashCode,
    accessToken,
    refreshToken,
    userInfo = null
  ) {
    let theUser;

    if (userInfo == null) {
      theUser = await UserInfoHelper.getUserInfoByPropertyValue(
        "hash",
        hashCode
      );
    } else {
      theUser = userInfo;
    }
    const updateUser = await UserInfoHelper.updateUserInfoByPropertyValue(
      "hash",
      theUser.hash,
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      }
    );
    return updateUser;
  }
}
