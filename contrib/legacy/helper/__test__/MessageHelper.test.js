import { MongoMemoryReplSet } from "mongodb-memory-server";
import { reinitPrismaClient } from "@time-fit/database/prisma.js";
import MessageHelper from "../MessageHelper.js";

let mongod;
let prisma;

// Sample message data for testing
const testMessages = [
  {
    label: 'welcome_message',
    group: 'welcome',
    groupIndex: 0,
    content: 'Welcome to our service!',
  },
  {
    label: 'welcome_reminder',
    group: 'welcome',
    groupIndex: 1,
    content: 'Just a friendly reminder to complete your profile!',
  },
  {
    label: 'walk_encouragement_1',
    group: 'walk_encouragement',
    groupIndex: 0,
    content: 'Great job on your walk today!',
  },
  {
    label: 'walk_encouragement_2',
    group: 'walk_encouragement',
    groupIndex: 1,
    content: 'Keep up the good work with your walking!',
  },
  {
    label: 'walk_encouragement_3',
    group: 'walk_encouragement',
    groupIndex: 2,
    content: 'Your walking streak is impressive!',
  },
];

beforeAll(async () => {
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "repl1" },
    });
    const databaseName = "test_messages";

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
    
    // Insert test messages
    await prisma.message.createMany({
      data: testMessages,
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
    await prisma.message.deleteMany({});
    // Re-insert test messages
    await prisma.message.createMany({
      data: testMessages,
    });
  }
});

describe("MessageHelper", () => {
  describe("findMessageByLabel", () => {
    it("should find a message by its label", async () => {
      const message = await MessageHelper.findMessageByLabel('welcome_message');
      
      expect(message).not.toBeNull();
      expect(message.label).toBe('welcome_message');
      expect(message.content).toBe('Welcome to our service!');
    });

    it("should return null for non-existent label", async () => {
      const message = await MessageHelper.findMessageByLabel('non_existent_label');
      expect(message).toBeNull();
    });
  });

  describe("findMessageByGroup", () => {
    it("should return a random message from the specified group", async () => {
      // Test multiple times to ensure randomness
      const results = new Set();
      for (let i = 0; i < 10; i++) {
        const message = await MessageHelper.findMessageByGroup('walk_encouragement');
        expect(message).not.toBeNull();
        expect(message.group).toBe('walk_encouragement');
        results.add(message.label);
      }
      
      // We should have gotten multiple different messages
      expect(results.size).toBeGreaterThan(1);
    });

    it("should return a message with the correct structure", async () => {
      const message = await MessageHelper.findMessageByGroup('walk_encouragement');
      
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('label');
      expect(message).toHaveProperty('group');
      expect(message).toHaveProperty('groupIndex');
      expect(message).toHaveProperty('content');
    });

    it("should return null for non-existent group", async () => {
      const message = await MessageHelper.findMessageByGroup('non_existent_group');
      expect(message).toBeUndefined();
    });
  });
});
