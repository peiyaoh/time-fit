import { PrismaClient } from "./prisma/generated/index.js";
import { createTimeEngine } from "@time-fit/core";
import { createPrismaStorage } from "@time-fit/storage-prisma";

const prisma = new PrismaClient();
await prisma.$connect();
await prisma.participant.create({ data: { id: "ada", timeZone: "America/Detroit", attributes: { cohort: "example" } } });
await prisma.task.create({
  data: {
    id: "stretch-break",
    spec: {
      id: "stretch-break", scope: "participant", checkpoints: [{ id: "morning", time: "10:30", daysOfWeek: [1, 2, 3, 4, 5] }],
      outcomes: [{ id: "remind", probability: 1, action: { type: "print-reminder", message: "Time to stretch" } }],
    },
  },
});

const engine = createTimeEngine({
  storage: createPrismaStorage({ prisma }),
  actions: [{ type: "print-reminder", execute: async () => ({ ok: true, delivery: { channel: "console" } }) }],
});
await engine.tick(new Date("2026-09-22T14:30:00.000Z"));
const [decision, participantCount] = await Promise.all([
  prisma.decision.findFirst({ select: { state: true } }),
  prisma.participant.count(),
]);
await prisma.$disconnect();
console.log(JSON.stringify({ state: decision?.state, participantCount }));
