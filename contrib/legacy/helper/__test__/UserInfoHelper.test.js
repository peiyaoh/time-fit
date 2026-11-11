import { MongoMemoryReplSet } from "mongodb-memory-server";
import { getPrismaClient, reinitPrismaClient } from "@time-fit/database/prisma.js";
import UserInfoHelper from "../UserInfoHelper.js";

let mongod;
let prisma;

// Sample user data for testing
const testUsers = [
  {
    username: "testuser1",
    password: "hashedpassword1",
    hash: "hash1",
    preferredName: "Test User 1",
    phone: "+1234567890",
    timezone: "America/New_York",
    phase: "baseline",
    joinAt: new Date(),
    autoWalkTo10: false,
  },
  {
    username: "testuser2",
    password: "hashedpassword2",
    hash: "hash2",
    preferredName: "Test User 2",
    phone: "+1987654321",
    timezone: "America/Los_Angeles",
    phase: "intervention",
    joinAt: new Date(),
    autoWalkTo10: true,
  },
  {
    username: "testuser3",
    password: "hashedpassword3",
    hash: "hash3",
    preferredName: "Test User 3",
    phone: "+1122334455",
    timezone: "America/Chicago",
    phase: "complete",
    joinAt: new Date(),
    autoWalkTo10: false,
  },
];

describe("UserInfoHelper", () => {
  beforeAll(async () => {
    try {
      // Set up in-memory MongoDB server
      mongod = await MongoMemoryReplSet.create({
        replSet: { count: 1, name: "repl1" },
      });
      const databaseName = "test_users";
      const uri = mongod.getUri();
      // Set the DATABASE_URL environment variable for Prisma
      process.env.DATABASE_URL = `${uri}`; // Add a unique db name per instance if needed
      // replace /? with /${databaseName}?
      // replace 127.0.0.1 with localhost
      process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
        `/?`,
        `/${databaseName}?`
      );
      
      // Reinitialize Prisma client with the test database URL
      prisma = await reinitPrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      await prisma.$connect();
      
      // Insert test users
      await prisma.users.createMany({
        data: testUsers,
      });
    } catch (error) {
      console.error("Error setting up test database:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up
      if (prisma) {
        await prisma.$disconnect();
      }
      if (mongod) {
        await mongod.stop();
      }
    } catch (error) {
      console.error("Error cleaning up test database:", error);
    }
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const users = await UserInfoHelper.getUsers();
      expect(users).toHaveLength(testUsers.length);
      
      // Verify all test users are returned
      testUsers.forEach((testUser) => {
        const foundUser = users.find((u) => u.username === testUser.username);
        expect(foundUser).toBeDefined();
        expect(foundUser.username).toBe(testUser.username);
      });
    });
  });

  describe("myGetUserList", () => {
    it("should return users without sensitive information", async () => {
      const userList = await UserInfoHelper.myGetUserList();
      
      expect(userList).toHaveLength(testUsers.length);
      
      // Verify sensitive fields are excluded
      userList.forEach((user) => {
        expect(user).not.toHaveProperty("password");
        expect(user).not.toHaveProperty("hash");
        expect(user).not.toHaveProperty("accessToken");
        expect(user).not.toHaveProperty("refreshToken");
        
        // Verify some expected fields are present
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("preferredName");
      });
    });
  });

  describe("getUserInfoByUsername", () => {
    it("should return user by username", async () => {
      const testUser = testUsers[0];
      const user = await UserInfoHelper.getUserInfoByUsername(testUser.username);
      
      expect(user).toBeDefined();
      expect(user.username).toBe(testUser.username);
      expect(user.preferredName).toBe(testUser.preferredName);
    });

    it("should return null for non-existent username", async () => {
      const user = await UserInfoHelper.getUserInfoByUsername("nonexistentuser");
      expect(user).toBeNull();
    });
  });

  describe("extractUserInfoCache", () => {
    it("should exclude sensitive information from user object", () => {
      const testUser = {
        id: "123",
        username: "testuser",
        password: "secret",
        hash: "hash123",
        accessToken: "token123",
        refreshToken: "refresh123",
        preferredName: "Test User",
        timezone: "UTC"
      };
      
      const result = UserInfoHelper.extractUserInfoCache(testUser);
      
      // Verify sensitive fields are excluded
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("hash");
      expect(result).not.toHaveProperty("accessToken");
      expect(result).not.toHaveProperty("refreshToken");
      
      // Verify other fields are included
      expect(result.username).toBe(testUser.username);
      expect(result.preferredName).toBe(testUser.preferredName);
      expect(result.timezone).toBe(testUser.timezone);
    });
  });

  describe("updateUserInfo", () => {
    it("should update user information", async () => {
      const testUser = testUsers[0];
      const updates = {
        preferredName: "Updated Name",
        timezone: "America/Denver"
      };
      
      const updatedUser = await UserInfoHelper.updateUserInfo(
        { username: testUser.username },
        updates
      );
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser.preferredName).toBe(updates.preferredName);
      expect(updatedUser.timezone).toBe(updates.timezone);
      
      // Verify the update was persisted
      const fetchedUser = await UserInfoHelper.getUserInfoByUsername(testUser.username);
      expect(fetchedUser.preferredName).toBe(updates.preferredName);
      expect(fetchedUser.timezone).toBe(updates.timezone);
    });
  });
});
