import {getPrismaClient} from "@time-fit/database/prisma.js";
import RandomizationHelper from "./RandomizationHelper.js";

export default class MessageHelper {
  constructor() {}

  static async findMessageByLabel(mLabel) {
    const prisma = getPrismaClient();
    const message = await prisma.message.findFirst({
      where: { label: mLabel },
    });
    return message;
  }

  static async findMessageByGroup(gGroupName) {
    const prisma = getPrismaClient();
    const messageList = await prisma.message.findMany({
      where: { group: gGroupName },
      orderBy: [
        {
          groupIndex: "asc",
        },
      ],
    });

    const randomIndex = Math.floor(
      messageList.length * RandomizationHelper.getRandomNumber()
    );
    const pickedMessage = messageList[randomIndex];
    return pickedMessage;
  }

  static async getMessagesSortedByUpdatedAt(sorting = "asc") {
    const prisma = getPrismaClient();
    return await prisma.message.findMany({
      orderBy: [
        {
          updatedAt: sorting,
        },
      ],
    });
  }
}
