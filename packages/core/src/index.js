// Public API of @time-fit/core: the engine plus the pure kernel it is built on.
export { ok, err } from "./result.js";
export { isValidTimeZone } from "./timeZone.js";
export { canonicalJson } from "./canonicalJson.js";
export { DECISION_ID_VERSION, decisionSubject, computeDecisionId, computeTaskVersion } from "./identity.js";
export { deriveSeed, seededRandom, selectArm, randomize } from "./randomization.js";
export { normalizeCheckpoint, checkpointKind, localDatesForWindow, occurrences } from "./checkpoint.js";
export { validateEligibility, evaluateEligibility, readOwnPath } from "./eligibility.js";
export { validatePrecondition, evaluatePrecondition } from "./precondition.js";
export { validateOutcomes } from "./outcomes.js";
export { validateTaskSpec, validateTaskSet } from "./taskSpec.js";
export { createTimeEngine } from "./engine/createTimeEngine.js";
export { EngineConfigError } from "./engine/errors.js";
export { DECISION_RECORD_SCHEMA } from "./engine/decision.js";
export { timeWindowCondition } from "./builtins/timeWindowCondition.js";
