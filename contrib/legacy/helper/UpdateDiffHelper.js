import { getPrismaClient } from "@time-fit/database/prisma.js";

export default class UpdateDiffHelper {
  constructor() {}

  static async getUpdateDiffByCriteria(
    criteria
  ) {
    const prisma = getPrismaClient();
    const responseList = await prisma.update_diff.findMany(criteria);
    return responseList;
  }

  static async insertUpdateDiffList(updateDiffList) {
    const prisma = getPrismaClient();
    if(updateDiffList.length == 0){
      return {count: 0};
    }
    return await prisma.update_diff.createMany({
      data: updateDiffList,
    });
  }

}
