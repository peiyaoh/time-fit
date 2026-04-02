import {getPrismaClient} from "./prisma.js";
export default class TaskHelper {
  constructor() {}

  static async getTasksSortedByCreatedAt(sorting = "asc") {
    const prisma = getPrismaClient();
    return await prisma.task.findMany({
      orderBy: [
        {
          createdAt: sorting,
        },
      ],
    });
  }

  static async getTasksSortedByPriority(sorting = "asc") {
    const prisma = getPrismaClient();
    return await prisma.task.findMany({
      where: { enabled: true },
      orderBy: [
        {
          priority: sorting,
        },
      ],
    });
  }
}
