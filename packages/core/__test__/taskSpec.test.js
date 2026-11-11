import { validateTaskSpec, validateTaskSet } from "../src/taskSpec.js";
import { fixtureValidationContext, loadFixture } from "./support/fixtures.js";

const { cases } = loadFixture("task-spec-validation.json");

describe("task-spec validation fixtures (ADR 0006)", () => {
  test.each(cases)("$name -> $expect", ({ spec, context, expect: expected }) => {
    const result = validateTaskSpec(spec, fixtureValidationContext(context));
    if (expected === "ok") {
      expect(result).toMatchObject({ ok: true });
    } else {
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe(expected);
    }
  });
});
