import { DateTime } from "luxon";
import DatabaseUtility from "../DatabaseUtility.js";

// Characterization tests for DatabaseUtility's non-persistence logic — the pieces that
// don't need a live database. These lock in current behavior before any future extraction
// of this logic into pure functions (Stage 3b), and specifically cover two methods,
// matchSqureBracketPlaceholder and diffDateTime, that were previously dead stubs
// (matchSqureBracketPlaceholder always returned [], diffDateTime always returned a fixed
// { seconds: 0 }) now wired to the real implementations in @time-fit/helper.

describe("DatabaseUtility.diffDateTime", () => {
  test("returns a positive duration when the second datetime is later", () => {
    const a = DateTime.fromISO("2024-01-01T00:00:00Z");
    const b = DateTime.fromISO("2024-01-01T00:00:10Z");
    expect(DatabaseUtility.diffDateTime(a, b, "seconds").toObject().seconds).toBe(10);
  });

  test("returns a negative duration when the second datetime is earlier", () => {
    const a = DateTime.fromISO("2024-01-01T00:00:10Z");
    const b = DateTime.fromISO("2024-01-01T00:00:00Z");
    expect(DatabaseUtility.diffDateTime(a, b, "seconds").toObject().seconds).toBe(-10);
  });

  test("no longer always returns a fixed zero (the pre-fix stub behavior)", () => {
    const a = DateTime.fromISO("2024-01-01T00:00:00Z");
    const b = DateTime.fromISO("2024-01-02T00:00:00Z");
    expect(DatabaseUtility.diffDateTime(a, b, "seconds").toObject().seconds).not.toBe(0);
  });
});

describe("DatabaseUtility.matchSqureBracketPlaceholder", () => {
  test("extracts every [bracketed] token from a message", () => {
    const message = "Hi [name], your goal is [goal] steps. [response|SV_1|last]";
    expect(DatabaseUtility.matchSqureBracketPlaceholder(message)).toEqual([
      "[name]",
      "[goal]",
      "[response|SV_1|last]",
    ]);
  });

  test("returns an empty list for a message with no brackets (the pre-fix stub behavior)", () => {
    expect(DatabaseUtility.matchSqureBracketPlaceholder("no placeholders here")).toEqual([]);
  });
});

describe("DatabaseUtility.replacePlaceholderFromMessage", () => {
  const userInfo = {
    username: "p001",
    preferredName: "Alex",
    dailyStepsGoal: 8000,
  };

  test("replaces [PID] with the participant's username", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Hello [PID]!",
      userInfo,
      "https://survey.example/s"
    );
    expect(result.message).toBe("Hello p001!");
    expect(result.nameReplaced).toBe(true);
  });

  test("replaces [name] with the participant's preferred name", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Hi [name], keep going.",
      userInfo,
      "https://survey.example/s"
    );
    expect(result.message).toBe("Hi Alex, keep going.");
    expect(result.nameReplaced).toBe(true);
  });

  test("replaces <link> with the survey link plus study_code query param", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Take the survey: <link>",
      userInfo,
      "https://survey.example/s"
    );
    expect(result.message).toBe(
      "Take the survey: https://survey.example/s?study_code=p001"
    );
    expect(result.surveyReplaced).toBe(true);
  });

  test("replaces [goal] with dailyStepsGoal when set", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Your goal: [goal] steps",
      userInfo,
      ""
    );
    expect(result.message).toBe("Your goal: 8000 steps");
  });

  test("defaults [goal] to 5000 when dailyStepsGoal is not set", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Your goal: [goal] steps",
      { username: "p002", preferredName: "Sam" },
      ""
    );
    expect(result.message).toBe("Your goal: 5000 steps");
  });

  test("leaves a message with no known placeholders unchanged", async () => {
    const result = await DatabaseUtility.replacePlaceholderFromMessage(
      "Just a plain message.",
      userInfo,
      ""
    );
    expect(result.message).toBe("Just a plain message.");
    expect(result.nameReplaced).toBe(false);
    expect(result.surveyReplaced).toBe(false);
  });
});

describe("DatabaseUtility.composeUserMessageForTwilio", () => {
  const userInfo = { username: "p001", preferredName: "Alex", dailyStepsGoal: 6000 };

  test("concatenates interventionMessage and walkMessage, substituting placeholders", async () => {
    const messageInfo = {
      interventionMessage: "Hi [name]!",
      walkMessage: "Goal: [goal] steps.",
    };
    const result = await DatabaseUtility.composeUserMessageForTwilio(
      userInfo,
      messageInfo,
      ""
    );
    expect(result).toBe("Hi Alex! Goal: 6000 steps. ");
  });

  test("appends a fallback survey link when a surveyURL is given but nothing in the message consumed it", async () => {
    const messageInfo = { interventionMessage: "Keep it up!" };
    const result = await DatabaseUtility.composeUserMessageForTwilio(
      userInfo,
      messageInfo,
      "https://survey.example/s"
    );
    expect(result).toBe(
      "Keep it up! https://survey.example/s?study_code=p001 ."
    );
  });
});
