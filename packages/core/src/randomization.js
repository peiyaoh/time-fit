import { createHmac } from "node:crypto";
import seedrandom from "seedrandom";

/**
 * @typedef {object} Outcome
 * @property {string} id
 * @property {number} probability
 */

/**
 * @typedef {object} RandomizationRecord
 * @property {"decisionId" | "hmac"} seedKind
 * @property {number | null} draw          null when there is a single outcome
 * @property {Readonly<Record<string, number>>} probabilities
 * @property {string} armId
 */

/**
 * With a salt, arms cannot be predicted from public decision ids (ADR 0004 §3).
 * @param {string} decisionId
 * @param {string | null | undefined} studySalt
 * @returns {{ seed: string, seedKind: "decisionId" | "hmac" }}
 */
export function deriveSeed(decisionId, studySalt) {
  if (typeof decisionId !== "string" || decisionId === "") {
    throw new TypeError("deriveSeed: decisionId must be a non-empty string");
  }
  if (studySalt === null || studySalt === undefined) {
    return { seed: decisionId, seedKind: "decisionId" };
  }
  if (typeof studySalt !== "string" || studySalt === "") {
    throw new TypeError("deriveSeed: studySalt must be a non-empty string when provided");
  }
  const seed = createHmac("sha256", studySalt).update(decisionId).digest("hex");
  return { seed, seedKind: "hmac" };
}

/**
 * Default `random` port: deterministic in its seed.
 * @param {string} seed
 * @returns {number} in [0, 1)
 */
export function seededRandom(seed) {
  return seedrandom(seed)();
}

/**
 * First outcome (declared order) whose cumulative probability exceeds the draw; the last
 * outcome when floating-point error leaves none. Matches the legacy `allowance < 0` rule.
 * @param {ReadonlyArray<Outcome>} outcomes
 * @param {number | null} draw  must be null exactly when there is one outcome
 * @returns {string} the selected outcome id
 */
export function selectArm(outcomes, draw) {
  assertOutcomes(outcomes);
  if (outcomes.length === 1) {
    if (draw !== null) throw new TypeError("selectArm: draw must be null for a single outcome");
    return outcomes[0].id;
  }
  assertDraw(draw);
  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.probability;
    if (draw < cumulative) return outcome.id;
  }
  return outcomes[outcomes.length - 1].id;
}

/**
 * @param {{ outcomes: ReadonlyArray<Outcome>, decisionId: string,
 *           studySalt?: string | null, random?: (seed: string) => number }} input
 * @returns {Readonly<RandomizationRecord>}
 */
export function randomize({ outcomes, decisionId, studySalt = null, random = seededRandom }) {
  assertOutcomes(outcomes);
  const { seed, seedKind } = deriveSeed(decisionId, studySalt);
  const draw = outcomes.length === 1 ? null : random(seed);
  const armId = selectArm(outcomes, draw);
  return Object.freeze({ seedKind, draw, probabilities: probabilitiesById(outcomes), armId });
}

function probabilitiesById(outcomes) {
  return Object.freeze(
    Object.fromEntries(outcomes.map((outcome) => [outcome.id, outcome.probability])),
  );
}

function assertOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    throw new TypeError("randomization: outcomes must be a non-empty array");
  }
}

function assertDraw(draw) {
  if (typeof draw !== "number" || !(draw >= 0 && draw < 1)) {
    throw new TypeError(`selectArm: draw must be a number in [0, 1), got ${draw}`);
  }
}
