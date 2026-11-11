import { computeDecisionId, computeTaskVersion, decisionSubject } from "../src/identity.js";
import { canonicalJson } from "../src/canonicalJson.js";
import { deriveSeed, randomize, seededRandom, selectArm } from "../src/randomization.js";
import { validateTaskSpec } from "../src/taskSpec.js";
import { fixtureValidationContext, loadFixture } from "./support/fixtures.js";

const identity = loadFixture("identity.json");

const versionOf = (spec) => {
  const result = validateTaskSpec(spec, fixtureValidationContext());
  expect(result.ok).toBe(true);
  return computeTaskVersion(result.value);
};

describe("identity fixtures (ADR 0004)", () => {
  test.each(identity.decisionIds)("decisionId for $input.subject", ({ input, decisionId }) => {
    expect(computeDecisionId({ ...input, scheduledAt: new Date(input.scheduledAt) })).toBe(decisionId);
  });

  test("participant named 'system' and system scope never collide", () => {
    const [participantSystem, systemScope] = [
      decisionSubject({ scope: "participant", participantId: "system" }),
      decisionSubject({ scope: "system" }),
    ];
    expect(participantSystem).toBe("p:system");
    expect(systemScope).toBe("s:system");
  });

  test("canonical JSON reproduces the fixture string and ignores key order", () => {
    const { specA, specB_sameContentDifferentKeyOrder: specB, canonicalOfSpecA_beforeDefaults } = identity.taskVersion;
    expect(canonicalJson(specA)).toBe(canonicalOfSpecA_beforeDefaults);
    expect(canonicalJson(specB)).toBe(canonicalOfSpecA_beforeDefaults);
  });

  test("taskVersion is stable under key order and hashes the normalized spec", () => {
    const { specA, specB_sameContentDifferentKeyOrder: specB, sha256OfCanonical_beforeDefaults } = identity.taskVersion;
    expect(versionOf(specA)).toBe(versionOf(specB));
    expect(versionOf(specA)).not.toBe(sha256OfCanonical_beforeDefaults);
    expect(computeTaskVersion(specA)).toBe(sha256OfCanonical_beforeDefaults);
  });

  test.each(identity.seeds)("seed and draw (salt=$salt)", ({ decisionId, salt, seed, draw }) => {
    const derived = deriveSeed(decisionId, salt);
    expect(derived.seed).toBe(seed);
    expect(derived.seedKind).toBe(salt === null ? "decisionId" : "hmac");
    expect(seededRandom(derived.seed)).toBe(draw);
  });

  test.each(identity.armSelection)("draw $draw selects $armId", ({ draw, outcomes, armId }) => {
    expect(selectArm(outcomes, draw)).toBe(armId);
  });

  test("randomize combines seed, draw, and arm reproducibly", () => {
    const [{ decisionId, draw }] = identity.seeds;
    const outcomes = identity.armSelection[0].outcomes;
    const record = randomize({ outcomes, decisionId });
    expect(record).toEqual({ seedKind: "decisionId", draw, probabilities: { prompt: 0.6, control: 0.4 }, armId: "prompt" });
    expect(randomize({ outcomes, decisionId })).toEqual(record);
  });
});
