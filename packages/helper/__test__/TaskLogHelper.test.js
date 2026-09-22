import { MongoMemoryReplSet } from "mongodb-memory-server";
import { reinitPrismaClient } from "@time-fit/database/prisma.js";
import TaskLogHelper from "../TaskLogHelper.js";
import { DateTime } from "luxon";

let mongod;
let prisma;

// Sample task and taskLog data for testing
const testTasks = [
  {
    label: "task1",
    index: 1,
    enabled: true,
    priority: 1,
    participantIndependent: false,
    preActivationLogging: false,
    ignoreTimezone: false,
    checkPoint: { type: "daily", hour: 9, minute: 0 },
    group: { name: "test-group" },
    randomization: { type: "simple", ratio: [0.5, 0.5] }
  },
  {
    label: "task2",
    index: 2,
    enabled: true,
    priority: 2,
    participantIndependent: true,
    preActivationLogging: true,
    ignoreTimezone: true,
    checkPoint: { type: "weekly", dayOfWeek: 1, hour: 10, minute: 0 },
    group: { name: "test-group" },
    randomization: { type: "simple", ratio: [0.5, 0.5] }
  }
];

const testUsers = [
  {
    fitbitId: "user1",
    username: "testuser1",
    password: "hashedpassword1",
    hash: "hash1"
  },
  {
    fitbitId: "user2",
    username: "testuser2",
    password: "hashedpassword2",
    hash: "hash2"
  }
];

const testTaskLogs = [
  {
    taskLabel: "task1",
    username: "testuser1",
    userInfoCache: { name: "Test User 1" },
    isActivated: true,
    activationReasoning: [{ reason: "scheduled" }],
    randomizationResult: { choice: 0, arm: "control" },
    actionLabel: "send_message",
    actionInfo: { messageType: "reminder" },
    executionResult: { value: { status: "success", message: "Message sent" } },
    createdAt: DateTime.utc(2022, 6, 22, 10, 0).toJSDate()
  },
  {
    taskLabel: "task1",
    username: "testuser2",
    userInfoCache: { name: "Test User 2" },
    isActivated: true,
    activationReasoning: [{ reason: "scheduled" }],
    randomizationResult: { choice: 1, arm: "intervention" },
    actionLabel: "send_message",
    actionInfo: { messageType: "reminder" },
    executionResult: { value: { status: "failed", message: "Network error" } },
    createdAt: DateTime.utc(2022, 6, 22, 10, 15).toJSDate()
  },
  {
    taskLabel: "task2",
    username: "testuser1",
    userInfoCache: { name: "Test User 1" },
    isActivated: true,
    activationReasoning: [{ reason: "manual" }],
    randomizationResult: { choice: 0, arm: "control" },
    actionLabel: "fetch_data",
    actionInfo: { dataType: "steps" },
    executionResult: { value: { status: "success", data: { steps: 5000 } } },
    createdAt: DateTime.utc(2022, 6, 23, 11, 0).toJSDate()
  }
];

beforeAll(async () => {
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "repl1" },
    });
    const databaseName = "test_task_logs";

    const uri = mongod.getUri();
    process.env.DATABASE_URL = `${uri}`;
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      `/?`,
      `/${databaseName}?`
    );

    prisma = await reinitPrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    await prisma.$connect();

    // Create test users first
    await prisma.users.createMany({
      data: testUsers,
    });

    // Create test tasks
    await prisma.task.createMany({
      data: testTasks,
    });

    // Insert test taskLogs
    await prisma.taskLog.createMany({
      data: testTaskLogs,
    });
  } catch (error) {
    console.error("beforeAll failed:", error);
    if (mongod) {
      await mongod
        .stop()
        .catch((e) =>
          console.error("Error stopping mongod in beforeAll catch:", e)
        );
    }
    throw error;
  }
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  // Clear the database before each test for isolation
  if (prisma) {
    // Delete taskLogs first due to foreign key constraints
    await prisma.taskLog.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.users.deleteMany({});

    // Re-create test data
    await prisma.users.createMany({
      data: testUsers,
    });

    await prisma.task.createMany({
      data: testTasks,
    });

    await prisma.taskLog.createMany({
      data: testTaskLogs,
    });
  }
});

describe("TaskLogHelper", () => {
  describe("insertTaskLogList", () => {
    it("should insert multiple task logs successfully", async () => {
      const newTaskLogs = [
        {
          taskLabel: "task1",
          username: "testuser1",
          userInfoCache: { name: "Test User 1" },
          isActivated: true,
          activationReasoning: [{ reason: "manual" }],
          randomizationResult: { choice: 1, arm: "intervention" },
          actionLabel: "send_notification",
          actionInfo: { notificationType: "reminder" },
          executionResult: { value: { status: "success", message: "Notification sent" } },
        },
        {
          taskLabel: "task2",
          username: "testuser2",
          userInfoCache: { name: "Test User 2" },
          isActivated: true,
          activationReasoning: [{ reason: "scheduled" }],
          randomizationResult: { choice: 0, arm: "control" },
          actionLabel: "fetch_data",
          actionInfo: { dataType: "heart_rate" },
          executionResult: { value: { status: "success", data: { heartRate: 75 } } },
        }
      ];

      const result = await TaskLogHelper.insertTaskLogList(newTaskLogs);
      expect(result.count).toBe(2);

      // Verify the data was inserted
      const allTaskLogs = await prisma.taskLog.findMany({});
      expect(allTaskLogs.length).toBe(5); // 3 original + 2 new
    });

    it("should handle empty array", async () => {
      const result = await TaskLogHelper.insertTaskLogList([]);
      expect(result.count).toBe(0);
    });
  });

  describe("getTaskLogWithErrorDuringPeriod", () => {
    it("should find task logs with errors within the specified date range", async () => {
      const startDate = DateTime.utc(2022, 6, 22);
      const endDate = DateTime.utc(2022, 6, 23);

      const errorLogs = await TaskLogHelper.getTaskLogWithErrorDuringPeriod(
        startDate.toJSDate(),
        endDate.toJSDate()
      );

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].taskLabel).toBe("task1");
      expect(errorLogs[0].username).toBe("testuser2");
      expect(errorLogs[0].executionResult.value.status).toBe("failed");
    });

    it("should return empty array when no error logs exist in the period", async () => {
      const startDate = DateTime.utc(2022, 7, 1);
      const endDate = DateTime.utc(2022, 7, 31);

      const errorLogs = await TaskLogHelper.getTaskLogWithErrorDuringPeriod(
        startDate.toJSDate(),
        endDate.toJSDate()
      );

      expect(errorLogs).toHaveLength(0);
    });

    it("should only return logs with failed status", async () => {
      const startDate = DateTime.utc(2022, 6, 1);
      const endDate = DateTime.utc(2022, 6, 30);

      const errorLogs = await TaskLogHelper.getTaskLogWithErrorDuringPeriod(
        startDate.toJSDate(),
        endDate.toJSDate()
      );

      expect(errorLogs).toHaveLength(1);
      errorLogs.forEach(log => {
        expect(log.executionResult.value.status).toBe("failed");
      });
    });
  });
});
