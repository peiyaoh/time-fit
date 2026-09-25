import { readFileSync } from "node:fs";
import { err, ok } from "../../src/result.js";

const FIXTURE_DIRECTORY = new URL("../fixtures/", import.meta.url);

/** @param {string} fileName */
export function loadFixture(fileName) {
  return JSON.parse(readFileSync(new URL(fileName, FIXTURE_DIRECTORY), "utf8"));
}

// Fixture plugins from fixtures/README.md; validation only needs `type` and `validate`.
function fixturePlugin(type) {
  return Object.freeze({
    type,
    validate: (params) => (params.rejectParams === true ? err("fixture-rejected", "rejectParams") : ok(undefined)),
  });
}

const toRegistry = (types) => new Map(types.map((type) => [type, fixturePlugin(type)]));

export const FIXTURE_CONDITION_TYPES = toRegistry(["fixture-met", "fixture-not-met", "fixture-error", "fixture-throws"]);
export const FIXTURE_ACTION_TYPES = toRegistry(["fixture-record", "fixture-throws", "fixture-gate"]);

/** @param {{ preferenceResolver?: boolean }} [overrides] */
export function fixtureValidationContext({ preferenceResolver = true } = {}) {
  return {
    conditionTypes: FIXTURE_CONDITION_TYPES,
    actionTypes: FIXTURE_ACTION_TYPES,
    hasPreferenceResolver: preferenceResolver,
  };
}
