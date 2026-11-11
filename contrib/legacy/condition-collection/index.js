export { default as TimeInPeriodCondition } from "./TimeInPeriodCondition.js";
export { default as UserInfoCondition } from "./UserInfoCondition.js";

// packages/condition-collection/others/* (HasTaskLogErrorDuringPeriodCondition,
// MessageSentDuringPeriodCondition, SurveyFilledByThisPersonCondition) are intentionally
// left out of this barrel — their fate (export vs. delete) is an open decision deferred to
// a later stage per the refactor plan; see docs/refactor-plan.md, Stage 1a.
