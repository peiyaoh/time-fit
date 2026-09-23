import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";
import { execSync } from "child_process";
import { getPrismaClient, reinitPrismaClient } from "@time-fit/database/prisma.js";
import EventHelper from "../EventHelper.js";

let mongod;
let prisma;

beforeAll(async () => {
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "repl1" },
    });
    const databaseName = "test";

    const uri = mongod.getUri();
    // Set the DATABASE_URL environment variable for Prisma
    process.env.DATABASE_URL = `${uri}`; // Add a unique db name per instance if needed
    // replace /? with /${databaseName}?
    // replace 127.0.0.1 with localhost
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      `/?`,
      `/${databaseName}?`
    );


    // Optional: Run Prisma migrations (if you have them)
    // This ensures your schema is applied to the in-memory database
    // Ensure your schema.prisma points to env("DATABASE_URL")

    // expect something like: DATABASE_URL="mongodb://localhost:27017/time_fit?"
    /*
    console.log("beforeAll: Running prisma db push...");
    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL},
    });
   
    console.log("beforeAll: prisma db push completed.");
    */

    prisma = await reinitPrismaClient({
      datasources: {
        db: {
          // 'db' should match the name of your datasource in schema.prisma
          url: process.env.DATABASE_URL,
        },
      },
    });

    await prisma.$connect();
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

afterEach(async () => {
  // Clean up the event collection after each test
  await prisma.event.deleteMany();
});

beforeEach(async () => {
  // Clear the database before each test for isolation
  // This depends on your models. A common way is to delete all data from each model.
  // Example (assuming you have User and Post models):
  if (prisma) {
    await prisma.event.deleteMany({});
    // Add deleteMany for all your models
  }
});

describe("insertEvent", () => {
  it("should insert an event and return the created event", async () => {
    const event = {
      type: "test",
      content: { foo: "bar" },
    };

    const result = await prisma.event.create({ data: event });

    expect(result).toHaveProperty("id");
    expect(result.type).toBe("test");
    expect(result.content).toEqual({ foo: "bar" });
    expect(result).toHaveProperty("createdAt");

    // Also verify it is in the database
    const found = await prisma.event.findUnique({ where: { id: result.id } });
    expect(found).not.toBeNull();
    expect(found.type).toBe("test");
    expect(found.content).toEqual({ foo: "bar" });
  });

  it("should throw if required fields are missing", async () => {
    await expect(EventHelper.insertEvent({})).rejects.toThrow();
  });
});
