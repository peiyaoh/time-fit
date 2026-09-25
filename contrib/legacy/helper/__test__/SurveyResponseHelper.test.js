import { MongoMemoryReplSet } from "mongodb-memory-server";
import { reinitPrismaClient } from "@time-fit/database/prisma.js";
import SurveyResponseHelper from "../SurveyResponseHelper.js";
import { DateTime } from "luxon";

let mongod;
let prisma;

// Sample response data for testing
const testResponses = [
  {
    participantId: "test1",
    responseId: "R_XMRDYnIbnI8GpOh",
    dateTime: DateTime.utc(2022, 6, 22, 1, 52).toJSDate(),
    surveyId: "SV_6QJa9e00C4gywQu",
    surveyLink: "https://umich.qualtrics.com/jfe/form/SV_6QJa9e00C4gywQu",
    surveyParamsString: "study_code=test1",
    content: "Stay the same",
  },
  {
    participantId: "test1",
    responseId: "R_2uX8jjqLRFDQ4m8",
    dateTime: DateTime.utc(2022, 6, 22, 1, 54).toJSDate(),
    surveyId: "SV_cACIS909SMXMUp8",
    surveyLink: "https://umich.qualtrics.com/jfe/form/SV_cACIS909SMXMUp8",
    surveyParamsString: "study_code=test1",
    content: "listen to music",
  },
  {
    participantId: "test2",
    responseId: "R_wYqbwGbXs6tZzhL",
    dateTime: DateTime.utc(2022, 5, 24, 8, 41).toJSDate(),
    surveyId: "SV_cACIS909SMXMUp8",
    surveyLink: "https://umich.qualtrics.com/jfe/form/SV_cACIS909SMXMUp8",
    surveyParamsString: "study_code=test2",
    content: "huh?",
  },
  {
    participantId: "test1",
    responseId: "R_12JXBJDX1pinp5W",
    dateTime: DateTime.utc(2022, 6, 23, 15, 30).toJSDate(),
    surveyId: "SV_bBoOhje0dSNbZgq",
    surveyLink: "https://umich.qualtrics.com/jfe/form/SV_bBoOhje0dSNbZgq",
    surveyParamsString: "study_code=test1",
    content: "bring a friend",
  },
];

beforeAll(async () => {
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "repl1" },
    });
    const databaseName = "test_survey_responses";

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

    // Create test participant users first since response has a foreign key to users
    await prisma.users.createMany({
      data: [
        {
          fitbitId: "test1",
          username: "testuser1",
          password: "hashedpassword1",
          hash: "hash1",
        },
        {
          fitbitId: "test2",
          username: "testuser2",
          password: "hashedpassword2",
          hash: "hash2",
        },
      ],
    });

    // Insert test responses
    await prisma.response.createMany({
      data: testResponses,
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
    // Delete responses first due to foreign key constraints
    await prisma.response.deleteMany({});
    await prisma.users.deleteMany({});

    // Re-create test data
    await prisma.users.createMany({
      data: [
        {
          fitbitId: "test1",
          username: "testuser1",
          password: "hashedpassword1",
          hash: "hash1",
        },
        {
          fitbitId: "test2",
          username: "testuser2",
          password: "hashedpassword2",
          hash: "hash2",
        },
      ],
    });

    await prisma.response.createMany({
      data: testResponses,
    });
  }
});

describe("SurveyResponseHelper", () => {
  describe("findSurveyResponseDuringPeriod", () => {
    it("should find responses within the specified date range", async () => {
      const startDate = DateTime.utc(2022, 6, 1);
      const endDate = DateTime.utc(2022, 6, 30);
      const surveyId = "SV_cACIS909SMXMUp8";

      const responses =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate
        );

      expect(responses).toHaveLength(1);
      expect(responses[0].surveyId).toBe(surveyId);
      expect(responses[0].participantId).toBe("test1");
      expect(responses[0].content).toBe("listen to music");
    });

    it("should return empty array when no responses exist for the survey", async () => {
      const startDate = DateTime.utc(2022, 6, 1);
      const endDate = DateTime.utc(2022, 6, 30);
      const surveyId = "NON_EXISTENT_SURVEY";

      const responses =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate
        );

      expect(responses).toHaveLength(0);
    });

    describe("limit parameter", () => {
      it("should respect the limit parameter with default sort", async () => {
        const startDate = DateTime.utc(2022, 1, 1);
        const endDate = DateTime.utc(2022, 12, 31);
        const surveyId = "SV_cACIS909SMXMUp8";

        // Should return only 1 response even though there are 2 matching
        const responses =
          await SurveyResponseHelper.findSurveyResponseDuringPeriod(
            surveyId,
            startDate,
            endDate,
            "desc", // default sort
            1 // limit to 1 result
          );

        expect(responses).toHaveLength(1);
        expect(responses[0].surveyId).toBe(surveyId);
        // Should return the most recent one by default
        expect(DateTime.fromJSDate(responses[0].dateTime).toUTC().toISO()).toBe(
          "2022-06-22T01:54:00.000Z"
        );
      });

      it("should respect the limit parameter with ascending sort", async () => {
        const startDate = DateTime.utc(2022, 1, 1);
        const endDate = DateTime.utc(2022, 12, 31);
        const surveyId = "SV_cACIS909SMXMUp8";

        // Should return only 1 response with ascending sort
        const responses =
          await SurveyResponseHelper.findSurveyResponseDuringPeriod(
            surveyId,
            startDate,
            endDate,
            "asc",
            1 // limit to 1 result
          );

        expect(responses).toHaveLength(1);
        expect(responses[0].surveyId).toBe(surveyId);
        // Should return the oldest one with ascending sort
        expect(DateTime.fromJSDate(responses[0].dateTime).toUTC().toISO()).toBe(
          "2022-05-24T08:41:00.000Z"
        );
      });

      it("should return all results when limit is greater than total matches", async () => {
        const startDate = DateTime.utc(2022, 1, 1);
        const endDate = DateTime.utc(2022, 12, 31);
        const surveyId = "SV_cACIS909SMXMUp8";

        // Should return all 2 matching responses
        const responses =
          await SurveyResponseHelper.findSurveyResponseDuringPeriod(
            surveyId,
            startDate,
            endDate,
            "desc", // default sort
            10 // limit larger than total matches
          );

        expect(responses).toHaveLength(2);
      });

      it("should return empty array when limit is 0", async () => {
        const startDate = DateTime.utc(2022, 1, 1);
        const endDate = DateTime.utc(2022, 12, 31);
        const surveyId = "SV_cACIS909SMXMUp8";

        const responses =
          await SurveyResponseHelper.findSurveyResponseDuringPeriod(
            surveyId,
            startDate,
            endDate,
            "desc", // default sort
            0 // limit to 0 results
          );

        expect(responses).toHaveLength(0);
      });

      it("should handle negative limit by returning all results", async () => {
        const startDate = DateTime.utc(2022, 1, 1);
        const endDate = DateTime.utc(2022, 12, 31);
        const surveyId = "SV_cACIS909SMXMUp8";

        const responses =
          await SurveyResponseHelper.findSurveyResponseDuringPeriod(
            surveyId,
            startDate,
            endDate,
            "desc", // default sort
            -1 // invalid limit
          );

        // Should ignore negative limit and return all results
        expect(responses.length).toBeGreaterThan(0);
      });
    });

    it("should return responses in descending order by default", async () => {
      const startDate = DateTime.utc(2022, 1, 1);
      const endDate = DateTime.utc(2022, 12, 31);
      const surveyId = "SV_cACIS909SMXMUp8";

      // Default sort should be descending
      const responses =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate
        );

      expect(responses).toHaveLength(2);
      // Should be in descending order (newest first)
      expect(responses[0].dateTime > responses[1].dateTime).toBe(true);
    });

    it("should return responses in ascending order when sort='asc' is specified", async () => {
      const startDate = DateTime.utc(2022, 1, 1);
      const endDate = DateTime.utc(2022, 12, 31);
      const surveyId = "SV_cACIS909SMXMUp8";

      // Explicitly set sort to ascending
      const responses =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate,
          "asc"
        );

      expect(responses).toHaveLength(2);
      // Should be in ascending order (oldest first)
      expect(responses[0].dateTime < responses[1].dateTime).toBe(true);
    });

    it("should return responses in descending order when sort='desc' is specified", async () => {
      const startDate = DateTime.utc(2022, 1, 1);
      const endDate = DateTime.utc(2022, 12, 31);
      const surveyId = "SV_cACIS909SMXMUp8";

      // Explicitly set sort to descending
      const responses =
        await SurveyResponseHelper.findSurveyResponseDuringPeriod(
          surveyId,
          startDate,
          endDate,
          "desc"
        );

      expect(responses).toHaveLength(2);
      // Should be in descending order (newest first)
      expect(responses[0].dateTime > responses[1].dateTime).toBe(true);
    });
  });
});
