import { loadFixture } from "./support/fixtures.js";
import { runScenario } from "./support/scenarioHarness.js";

const { scenarios } = loadFixture("engine-scenarios.json");

const recordKey = (record) =>
  [record.scope === "system" ? "s:system" : `p:${record.participantId}`, record.taskId, record.checkpointId, record.scheduledAt].join("|");
const expectedKey = (expected) => [expected.subject, expected.taskId, expected.checkpointId, expected.scheduledAt].join("|");

function expectRecordFields(record, expected, observations, scenario) {
  const fieldReaders = {
    state: () => record.state,
    reasons: () => record.availability.reasons,
    armId: () => record.randomization?.armId,
    draw: () => record.randomization?.draw,
    decisionId: () => record.decisionId,
    errorCode: () => record.error?.code,
    latenessMs: () => record.latenessMs,
    taskVersionIsOriginal: () => record.taskVersion === observations.versionOf(scenario.tasks.find((task) => task.id === record.taskId)),
  };
  const ignored = new Set(["subject", "taskId", "checkpointId", "scheduledAt"]);
  for (const [field, value] of Object.entries(expected).filter(([field]) => !ignored.has(field))) {
    expect({ field, actual: fieldReaders[field]() }).toEqual({ field, actual: value });
  }
}

describe("engine scenarios (ADR 0001-0005)", () => {
  test.each(scenarios)("$name", async (scenario) => {
    const observations = await runScenario(scenario);
    const { expect: expected } = scenario;

    if (expected.records !== undefined) {
      expect(observations.records.map(recordKey).sort()).toEqual(expected.records.map(expectedKey).sort());
      for (const expectedRecord of expected.records) {
        const record = observations.records.find((candidate) => recordKey(candidate) === expectedKey(expectedRecord));
        expectRecordFields(record, expectedRecord, observations, scenario);
      }
    }
    if (expected.actionCalls !== undefined) expect(observations.callLog).toHaveLength(expected.actionCalls);
    if (expected.actionCallOrder !== undefined) expect(observations.callLog.map((call) => call.taskId)).toEqual(expected.actionCallOrder);
    for (const summaryKey of ["summary", "summary_lastTick"]) {
      if (expected[summaryKey] !== undefined) expect(observations.lastSummary.counts).toMatchObject(expected[summaryKey]);
    }
    if (expected.gaps !== undefined) {
      expect(observations.gaps.map(({ from, to }) => ({ from, to }))).toEqual(expected.gaps);
    }
    for (const event of expected.logEvents ?? []) expect(observations.logEvents).toContain(event);
  });
});
