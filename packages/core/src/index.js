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

// Public type contracts (see src/contracts.js).
/**
 * @typedef {import("./contracts.js").EngineConfig} EngineConfig
 * @typedef {import("./contracts.js").EngineOptions} EngineOptions
 * @typedef {import("./contracts.js").StoragePorts} StoragePorts
 * @typedef {import("./contracts.js").TimeEngine} TimeEngine
 * @typedef {import("./contracts.js").TickResult} TickResult
 * @typedef {import("./contracts.js").TickSummary} TickSummary
 * @typedef {import("./contracts.js").SkippedTick} SkippedTick
 * @typedef {import("./contracts.js").TickOutcome} TickOutcome
 * @typedef {import("./contracts.js").Participant} Participant
 * @typedef {import("./contracts.js").ParticipantInput} ParticipantInput
 * @typedef {import("./contracts.js").CheckpointInput} CheckpointInput
 * @typedef {import("./contracts.js").ActionNode} ActionNode
 * @typedef {import("./contracts.js").PreconditionInput} PreconditionInput
 * @typedef {import("./contracts.js").EligibilityInput} EligibilityInput
 * @typedef {import("./contracts.js").ParticipantPage} ParticipantPage
 * @typedef {import("./contracts.js").ParticipantsPort} ParticipantsPort
 * @typedef {import("./contracts.js").TaskSpecInput} TaskSpecInput
 * @typedef {import("./contracts.js").ListActiveOptions} ListActiveOptions
 * @typedef {import("./contracts.js").TasksPort} TasksPort
 * @typedef {import("./contracts.js").DecisionLogPort} DecisionLogPort
 * @typedef {import("./contracts.js").DecisionRecord} DecisionRecord
 * @typedef {import("./contracts.js").DecisionState} DecisionState
 * @typedef {import("./contracts.js").ErrorFields} ErrorFields
 * @typedef {import("./contracts.js").Logger} Logger
 * @typedef {import("./contracts.js").PluginContext} PluginContext
 * @typedef {import("./contracts.js").ValidationResult} ValidationResult
 * @typedef {import("./contracts.js").ConditionResult} ConditionResult
 * @typedef {import("./contracts.js").ActionResult} ActionResult
 */
/**
 * @template [P=Record<string, unknown>]
 * @typedef {import("./contracts.js").ConditionPlugin<P>} ConditionPlugin
 */
/**
 * @template [P=Record<string, unknown>]
 * @typedef {import("./contracts.js").ActionPlugin<P>} ActionPlugin
 */
