import { getPrismaClient } from "@time-fit/database/prisma.js";
export default class LogHelper {
  constructor() {}

  static async getLogByCriteria(
    criteria
  ) {
    const prisma = getPrismaClient();
    const logList = await prisma.log.findMany(criteria);
    return logList;
  }

  static async insertLogList(logList) {
    const prisma = getPrismaClient();
    if(logList.length == 0){
      return {count: 0};
    }
    return await prisma.log.createMany({
      data: logList,
    });
  }
}
