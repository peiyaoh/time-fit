// Public type contracts of @time-fit/core (ADR 0002-0006, 0013). This module has no runtime
// code; it exists so the generated declarations describe the API that createTimeEngine and the
// ports actually accept and return.

/**
 * What a participants port must supply. Core reads only `id` and `timeZone`; any other fields
 * are passed through and reachable by dotted paths (ADR 0001). Application interfaces with
 * extra fields are assignable.
 * @typedef {{ id: string, timeZone: string }} ParticipantInput
 */

/**
 * A participant as the engine hands it to plugins and hooks: the supplied object, copied and
 * frozen, with its extra fields readable as `unknown`.
 * @typedef {ParticipantInput & Record<string, unknown>} Participant
 */

/**
 * @typedef {{ id: string, cron: string, offsetMinutes?: number }
 *   | { id: string, time: string, daysOfWeek?: number[], offsetMinutes?: number }
 *   | { id: string, preference: string, daysOfWeek?: number[], offsetMinutes?: number }} CheckpointInput  (ADR 0005)
 */

/**
 * An action node in a task spec: the registered plugin `type` plus that plugin's params.
 * @typedef {{ type: string } & Record<string, unknown>} ActionNode
 */

/**
 * @typedef {{ all: PreconditionInput[] } | { any: PreconditionInput[] } | { not: PreconditionInput }
 *   | { condition: { type: string } & Record<string, unknown> }} PreconditionInput  (ADR 0006)
 */

/**
 * @typedef {object} EligibilityInput  (ADR 0001 §3)
 * @property {string[]} [participantIds]
 * @property {{ mode: "all" | "any", match: Record<string, Array<string | number | boolean | null>> }} [attributes]
 */

/**
 * @typedef {object} TaskSpecFields
 * @property {string} id
 * @property {boolean} [enabled]
 * @property {number} [priority]
 * @property {string} [activeFrom]   ISO instant with an explicit offset
 * @property {string} [activeUntil]  ISO instant with an explicit offset
 * @property {EligibilityInput} [eligibility]
 * @property {CheckpointInput[]} checkpoints
 * @property {PreconditionInput} [precondition]
 * @property {Array<{ id: string, probability: number, action: ActionNode | null }>} outcomes
 * @property {boolean} [logUnavailable]
 */

/**
 * A task spec as supplied to the engine (ADR 0006). The engine still validates it at runtime,
 * for specs loaded from storage and for value ranges the types cannot express.
 * @typedef {(TaskSpecFields & { scope: "participant" }) | (TaskSpecFields & { scope: "system", timeZone: string })} TaskSpecInput
 */

/**
 * @typedef {object} ParticipantPage
 * @property {ReadonlyArray<ParticipantInput>} items  non-empty unless `nextCursor` is null (ADR 0013)
 * @property {string | null} nextCursor
 */

/**
 * @typedef {object} ParticipantsPort
 * @property {(request: { cursor: string | null, limit: number }) => Promise<ParticipantPage>} iterate
 */

/**
 * @typedef {object} ListActiveOptions
 * @property {Date} windowFrom  start of the tick's evaluation window (ADR 0013)
 */

/**
 * @typedef {object} TasksPort
 * @property {(at: Date, options?: ListActiveOptions) => Promise<ReadonlyArray<TaskSpecInput>>} listActive
 */

/**
 * @typedef {object} ErrorFields
 * @property {string} code
 * @property {string} message
 * @property {string} [stack]
 */

/**
 * @typedef {object} ConditionEvaluation
 * @property {string} path
 * @property {string} type
 * @property {boolean} ok
 * @property {boolean} [met]
 * @property {unknown} [evidence]
 * @property {ErrorFields} [error]
 */

/**
 * @typedef {object} Availability
 * @property {boolean} available
 * @property {ReadonlyArray<"precondition-not-met" | "condition-error">} reasons
 * @property {ReadonlyArray<ConditionEvaluation>} conditions
 */

/**
 * @typedef {object} RandomizationRecord
 * @property {"decisionId" | "hmac"} seedKind
 * @property {number | null} draw
 * @property {Readonly<Record<string, number>>} probabilities
 * @property {string} armId
 */

/**
 * @typedef {"claimed" | "unavailable" | "completed" | "failed"} DecisionState
 */

/**
 * A decision record (ADR 0004). Instants are ISO-8601 UTC strings.
 * @typedef {object} DecisionRecord
 * @property {"time-fit.decision/v1"} schema
 * @property {string} decisionId
 * @property {string} tickId
 * @property {"participant" | "system"} scope
 * @property {string | null} participantId
 * @property {string} taskId
 * @property {string} taskVersion
 * @property {string} checkpointId
 * @property {string} scheduledAt
 * @property {string} timeZone
 * @property {string} evaluatedAt
 * @property {number} latenessMs
 * @property {Availability} availability
 * @property {unknown} [snapshot]
 * @property {RandomizationRecord | null} randomization
 * @property {({ type: string } & Record<string, unknown>) | null} action
 * @property {DecisionState} state
 * @property {string} claimedAt
 * @property {string} [claimToken]   added by stores that keep it
 * @property {string} [finishedAt]
 * @property {{ delivery: unknown }} [result]
 * @property {ErrorFields} [error]
 */

/**
 * @typedef {object} DecisionLogPort
 * @property {(record: Readonly<DecisionRecord>, options: { token: string }) => Promise<{ claimed: boolean }>} claim
 * @property {(decisionId: string, result: { finishedAt: string, delivery?: unknown }) => Promise<{ applied: boolean }>} complete
 * @property {(decisionId: string, result: { finishedAt: string, error: ErrorFields }) => Promise<{ applied: boolean }>} fail
 * @property {(gap: { from: Date, to: Date, tickId: string }) => Promise<void>} [recordGap]
 */

/**
 * @typedef {object} Logger
 * @property {(event: string, fields: object) => void} debug
 * @property {(event: string, fields: object) => void} info
 * @property {(event: string, fields: object) => void} warn
 * @property {(event: string, fields: object) => void} error
 */

/**
 * @typedef {object} PluginContext
 * @property {string} decisionId
 * @property {string} taskId
 * @property {string} checkpointId
 * @property {Date} scheduledAt
 * @property {string} timeZone
 * @property {Readonly<Participant> | null} participant  null for system-scope tasks
 * @property {Logger} logger
 * @property {AbortSignal} signal  aborted when the plugin times out
 */

/**
 * @typedef {{ ok: true, value: undefined } | { ok: false, error: { code: string, message: string, details?: object } }} ValidationResult
 */

/**
 * @typedef {{ ok: true, met: boolean, evidence?: unknown } | { ok: false, error: { code: string, message: string } }} ConditionResult
 */

/**
 * @typedef {{ ok: true, delivery?: unknown } | { ok: false, error: { code: string, message: string } }} ActionResult
 */

/**
 * A Condition plugin (ADR 0003). `P` is the shape of its params in a task spec.
 * @template [P=Record<string, unknown>]
 * @typedef {object} ConditionPlugin
 * @property {string} type
 * @property {(params: P) => ValidationResult} [validate]
 * @property {(params: P, ctx: PluginContext) => Promise<ConditionResult>} evaluate
 */

/**
 * An Action plugin (ADR 0003). `P` is the shape of its params in a task spec.
 * @template [P=Record<string, unknown>]
 * @typedef {object} ActionPlugin
 * @property {string} type
 * @property {(params: P) => ValidationResult} [validate]
 * @property {(params: P, ctx: PluginContext) => Promise<ActionResult>} execute
 */

/**
 * @typedef {object} EngineOptions
 * @property {number} [catchUpWindowMinutes]  1-1440, default 5
 * @property {number} [concurrency]           1-64, default 1
 * @property {number} [pageSize]              1-1000, default 100
 * @property {number} [maxParticipants]       default 100,000
 * @property {number} [maxTasks]              1-10,000, default 500
 * @property {number} [pluginTimeoutMs]       1-600,000, default 30,000
 */

/**
 * @typedef {object} StoragePorts
 * @property {ParticipantsPort} [participants]
 * @property {TasksPort} [tasks]
 * @property {DecisionLogPort} [decisionLog]
 */

/**
 * @typedef {{ decisionLog: DecisionLogPort } | { storage: { decisionLog: DecisionLogPort } }} DecisionLogSource
 * @typedef {{ tasks: ReadonlyArray<TaskSpecInput> | TasksPort } | { storage: { tasks: TasksPort } }} TaskSource
 */

/**
 * Fields shared by both ways of supplying the decision log. Plugin arrays accept plugins with
 * any params type (`never` makes every specific `ActionPlugin<P>` assignable).
 * @typedef {object} EngineConfigBase
 * @property {StoragePorts} [storage]
 * @property {ParticipantsPort} [participants]   required at runtime for participant-scope tasks
 * @property {ReadonlyArray<TaskSpecInput> | TasksPort} [tasks]  static specs, or a port
 * @property {DecisionLogPort} [decisionLog]
 * @property {ReadonlyArray<ConditionPlugin<never>>} [conditions]
 * @property {ReadonlyArray<ActionPlugin<never>>} [actions]
 * @property {(participant: Readonly<Participant> | null, request: { taskId: string, checkpointId: string, preference: string }, localDate: string) => Promise<{ ok: true, value: string } | { ok: false, error: { code: string, message: string } }>} [preferenceResolver]
 *   `participant` is null for system-scope tasks
 * @property {{ now: () => Date }} [clock]
 * @property {(seed: string) => number} [random]  returns a number in [0, 1)
 * @property {Logger} [logger]
 * @property {(participant: Readonly<Participant>) => unknown} [snapshot]
 * @property {string} [studySalt]
 * @property {EngineOptions} [options]
 */

/**
 * `createTimeEngine` input. A decision log and a task source (static specs or a tasks port) are
 * required, each either directly or inside `storage`.
 * @typedef {EngineConfigBase & DecisionLogSource & TaskSource} EngineConfig
 */

/**
 * @typedef {"occurrence" | "ineligible" | "unavailable" | "unavailableRecorded" | "claimed"
 *   | "skippedClaimed" | "completed" | "failed" | "claimFailed" | "finalizeFailed"
 *   | "preferenceUnresolved" | "participantInvalid" | "participantInvalidTimezone"
 *   | "taskRejected"} TickOutcome
 */

/**
 * @typedef {object} TickSummary
 * @property {string} tickId
 * @property {string} now
 * @property {{ from: string, to: string } | null} window  null when the clock did not advance
 * @property {boolean} completed
 * @property {"tasks" | "participants"} [failedStage]
 * @property {Readonly<Record<TickOutcome, number>>} counts
 * @property {number} durationMs
 */

/**
 * @typedef {{ skipped: "in-flight" }} SkippedTick
 */

/**
 * @typedef {Readonly<TickSummary> | Readonly<SkippedTick>} TickResult
 */

/**
 * @typedef {object} TimeEngine
 * @property {(now?: Date) => Promise<TickResult>} tick  primary entry point (ADR 0005 §4)
 * @property {() => void} start  ticks at every minute boundary
 * @property {() => Promise<void>} stop  resolves after any in-flight tick finishes
 */

export {};
