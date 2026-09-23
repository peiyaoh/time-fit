import { MongoMemoryReplSet } from "mongodb-memory-server";
import { reinitPrismaClient } from "@time-fit/database/prisma.js";
import TaskHelper from "../TaskHelper.js";

let mongod;
let prisma;

// Sample task data for testing based on MyTaskList.mjs structure
const testTasks = [
  {
    label: "task-high-priority",
    enabled: true,
    priority: 1,
    participantIndependent: true,
    preActivationLogging: false,
    ignoreTimezone: true,
    checkPoint: {
      type: "relative",
      reference: {
        weekIndexList: [1, 2, 3, 4, 5, 6, 7],
        type: "fixed",
        value: "09:00 AM"
      },
      offset: { type: "plus", value: { hours: 0 } },
      repeat: {
        interval: { minutes: 240 },
        range: {
          after: { distance: { minutes: 24 * 60 } }
        }
      }
    },
    group: {
      type: "all"
    },
    randomization: {
      enabled: true,
      outcome: [
        {
          value: true,
          chance: 1.0,
          action: {
            type: "messageLabelToResearchInvestigator",
            messageLabel: "test_message_1"
          }
        }
      ]
    }
  },
  {
    label: "task-medium-priority",
    enabled: true,
    priority: 50,
    participantIndependent: false,
    preActivationLogging: true,
    ignoreTimezone: false,
    checkPoint: {
      type: "relative",
      reference: {
        weekIndexList: [1, 2, 3, 4, 5],
        type: "preference",
        value: "wakeupTime"
      },
      offset: { type: "plus", value: { hours: 2 } },
      repeat: {
        interval: { hours: 24 },
        range: {
          after: { distance: { hours: 2 } }
        }
      }
    },
    group: {
      type: "group",
      membership: {
        gif: ["group1"],
        salience: [],
        modification: []
      }
    },
    randomization: {
      enabled: true,
      outcome: [
        {
          value: true,
          chance: 0.8,
          action: {
            type: "messageGroup",
            messageGroup: "test_group_1"
          }
        }
      ]
    }
  },
  {
    label: "task-disabled",
    enabled: false,
    priority: 10,
    participantIndependent: true,
    preActivationLogging: false,
    ignoreTimezone: true,
    checkPoint: {
      type: "absolute",
      reference: {
        weekIndexList: [6, 7],
        type: "fixed",
        value: "06:00 PM"
      },
      offset: { type: "minus", value: { minutes: 30 } }
    },
    group: {
      type: "list",
      list: ["user1", "user2"]
    },
    randomization: {
      enabled: false
    }
  }
];

beforeAll(async () => {
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "repl1" },
    });
    const databaseName = "test_tasks";

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
    
    // Insert test tasks
    await prisma.task.createMany({
      data: testTasks,
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
    await prisma.task.deleteMany({});
    
    // Re-insert test tasks
    await prisma.task.createMany({
      data: testTasks,
    });
  }
});

describe("TaskHelper", () => {
  describe("getTasksSortedByPriority - sort", () => {
    it("should return enabled tasks sorted by priority in ascending order by default", async () => {
      const tasks = await TaskHelper.getTasksSortedByPriority();
      
      // Should only return enabled tasks
      expect(tasks).toHaveLength(2);
      
      // Should be sorted by priority in ascending order
      expect(tasks[0].priority).toBeLessThanOrEqual(tasks[1].priority);
      
      // Verify labels of returned tasks
      const taskLabels = tasks.map(t => t.label);
      expect(taskLabels).toContain("task-high-priority");
      expect(taskLabels).toContain("task-medium-priority");
      expect(taskLabels).not.toContain("task-disabled");
    });


    it("should return tasks sorted by priority in descending order when specified", async () => {
      const tasks = await TaskHelper.getTasksSortedByPriority("desc");
      
      // Should only return enabled tasks
      expect(tasks).toHaveLength(2);
      
      // Should be sorted by priority in descending order
      expect(tasks[0].priority).toBeGreaterThanOrEqual(tasks[1].priority);
      
      // First task should be the one with higher priority (lower number)
      expect(tasks[1].label).toBe("task-high-priority");
      expect(tasks[0].label).toBe("task-medium-priority");
    });

  });

  describe("getTasksSortedByPriority - empty", () => {

    it("should return empty array when no enabled tasks exist", async () => {
      // Delete all tasks
      await prisma.task.deleteMany({});
      
      // Insert only disabled tasks
      await prisma.task.create({
        data: {
          ...testTasks[2], // task-disabled
          enabled: false
        }
      });
      
      const tasks = await TaskHelper.getTasksSortedByPriority();
      expect(tasks).toHaveLength(0);
    });

    it("should handle empty database by returning empty array", async () => {
      // Delete all tasks
      await prisma.task.deleteMany({});
      
      const tasks = await TaskHelper.getTasksSortedByPriority();
      expect(tasks).toHaveLength(0);
    });

  });
});
