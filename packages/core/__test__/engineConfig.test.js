import { createTimeEngine, EngineConfigError } from "../src/index.js";
import { createMemoryStore } from "../src/memory/index.js";
import { participantTask, recordingAction } from "./support/engineKit.js";

const store = () => createMemoryStore();
const problemCodes = (config) => {
  try {
    createTimeEngine(config);
  } catch (error) {
    expect(error).toBeInstanceOf(EngineConfigError);
    expect(error.code).toBe("invalid-engine-config");
    return error.problems.map((problem) => problem.code);
  }
  throw new Error("expected EngineConfigError");
};

describe("createTimeEngine configuration", () => {
  test.each([
    ["non-object", null, ["config-not-object"]],
    ["array", [], ["config-not-object"]],
    ["empty", {}, ["missing-tasks", "invalid-decision-log"]],
    ["unknown field", { storage: store(), extra: 1 }, ["unknown-config-field"]],
    ["null storage", { storage: null }, ["invalid-storage", "missing-tasks", "invalid-decision-log"]],
    ["explicit null participants", { storage: store(), participants: null }, ["invalid-participants-port"]],
    ["recordGap not a function", { storage: { ...store(), decisionLog: { ...store().decisionLog, recordGap: 1 } } }, ["invalid-decision-log"]],
    ["conditions not array", { storage: store(), conditions: {} }, ["invalid-conditions"]],
    ["bad plugin", { storage: store(), actions: [{ type: "Bad Type", execute() {} }] }, ["invalid-action"]],
    ["plugin without method", { storage: store(), actions: [{ type: "x" }] }, ["invalid-action"]],
    ["duplicate built-in", { storage: store(), conditions: [{ type: "time-window", evaluate() {} }] }, ["duplicate-condition-type"]],
    ["options not object", { storage: store(), options: 5 }, ["invalid-options"]],
    ["unknown option", { storage: store(), options: { speed: 1 } }, ["unknown-option"]],
    ["null option", { storage: store(), options: { concurrency: null } }, ["invalid-option"]],
    ["option out of range", { storage: store(), options: { catchUpWindowMinutes: 2000 } }, ["invalid-option"]],
    ["bad services", { storage: store(), random: 1, clock: {}, logger: { info() {} }, studySalt: "" }, ["invalid-random", "invalid-clock", "invalid-logger", "invalid-study-salt"]],
    ["invalid static task", { storage: store(), tasks: [{ id: "x" }] }, ["invalid-task"]],
    ["static participant task without participants port", { decisionLog: store().decisionLog, tasks: [participantTask()], actions: [recordingAction()] }, ["missing-participants-port"]],
  ])("%s", (_label, config, codes) => {
    expect(problemCodes(config)).toEqual(codes);
  });

  test("lists every problem in the message", () => {
    expect(() => createTimeEngine({})).toThrow(/\[missing-tasks\][\s\S]*\[invalid-decision-log\]/);
  });

  test("accepts explicit ports without storage and returns a frozen engine", () => {
    const { participants, decisionLog } = store();
    const engine = createTimeEngine({ participants, decisionLog, tasks: [participantTask()], actions: [recordingAction()] });
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.keys(engine)).toEqual(["tick", "start", "stop"]);
  });
});
