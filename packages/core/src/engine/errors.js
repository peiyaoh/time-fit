/**
 * Thrown by `createTimeEngine` when its configuration is unusable. `problems` lists every
 * issue found, so a developer can fix them all in one pass.
 */
export class EngineConfigError extends Error {
  /**
   * @param {ReadonlyArray<{ code: string, message: string, details?: object }>} problems
   */
  constructor(problems) {
    super(`Invalid time engine configuration:\n${problems.map((problem) => `- [${problem.code}] ${problem.message}`).join("\n")}`);
    this.name = "EngineConfigError";
    this.code = "invalid-engine-config";
    this.problems = Object.freeze(problems.map((problem) => Object.freeze({ ...problem })));
  }
}
