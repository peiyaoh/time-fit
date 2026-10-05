const DEFAULT_MAX_TASKS = 500;
const MAX_TASKS_LIMIT = 10_000;
const CLAIMABLE_STATES = new Set(["claimed", "unavailable"]);

/**
 * @typedef {(...args: any[]) => Promise<any>} PrismaDelegateMethod
 * @typedef {object} PrismaClientLike  the delegates a client generated from the shipped models provides
 * @property {{ findMany: PrismaDelegateMethod }} participant
 * @property {{ findMany: PrismaDelegateMethod }} task
 * @property {{ create: PrismaDelegateMethod, findUnique: PrismaDelegateMethod, updateMany: PrismaDelegateMethod }} decision
 * @property {{ create: PrismaDelegateMethod }} gap
 */

/**
 * @typedef {object} PrismaStorage
 * @property {import("@time-fit/core").ParticipantsPort} participants
 * @property {import("@time-fit/core").TasksPort} tasks
 * @property {import("@time-fit/core").DecisionLogPort & { recordGap: NonNullable<import("@time-fit/core").DecisionLogPort["recordGap"]> }} decisionLog
 */

/**
 * Creates @time-fit/core storage ports backed by an application-owned Prisma client.
 * The client is injected so importing this package never creates a connection or selects a
 * schema. The application is responsible for connecting and disconnecting its client.
 *
 * `maxTasks` bounds how many candidate tasks one `listActive` call may return. More matching
 * rows make the call throw, so the tick aborts visibly instead of silently skipping tasks.
 *
 * @param {{ prisma: PrismaClientLike, maxTasks?: number }} dependencies
 * @returns {Readonly<PrismaStorage>} immutable ports
 */
export function createPrismaStorage({ prisma, maxTasks = DEFAULT_MAX_TASKS } = {}) {
  assertPrismaClient(prisma);
  assertMaxTasks(maxTasks);
  return Object.freeze({
    participants: createParticipantsPort(prisma),
    tasks: createTasksPort(prisma, maxTasks),
    decisionLog: createDecisionLogPort(prisma),
  });
}

function createParticipantsPort(prisma) {
  return Object.freeze({
    async iterate({ cursor, limit } = {}) {
      assertPageRequest(cursor, limit);
      const rows = await prisma.participant.findMany({
        where: cursor === null ? undefined : { id: { gt: cursor } },
        orderBy: { id: "asc" },
        take: limit + 1,
      });
      const pageRows = rows.slice(0, limit);
      return Object.freeze({
        items: Object.freeze(pageRows.map(mapParticipant)),
        nextCursor: rows.length > limit ? pageRows.at(-1).id : null,
      });
    },
  });
}

function createTasksPort(prisma, maxTasks) {
  return Object.freeze({
    /**
     * Tasks that started by `at` and had not ended by `windowFrom` (default: `at`). The engine
     * passes the start of its evaluation window, so a task that ended inside the window still
     * has its earlier occurrences evaluated (ADR 0013).
     */
    async listActive(at, { windowFrom = at } = {}) {
      assertDate("listActive: at", at);
      assertDate("listActive: windowFrom", windowFrom);
      if (windowFrom > at) throw new TypeError("listActive: windowFrom must not be after at");
      const rows = await prisma.task.findMany({
        where: {
          AND: [
            { OR: [{ activeFrom: null }, { activeFrom: { lte: at } }] },
            { OR: [{ activeUntil: null }, { activeUntil: { gt: windowFrom } }] },
          ],
        },
        orderBy: { id: "asc" },
        take: maxTasks + 1,
      });
      if (rows.length > maxTasks) throw taskCapacityExceeded(maxTasks);
      return Object.freeze(rows.map((row) => freezeCopy(row.spec)));
    },
  });
}

function taskCapacityExceeded(maxTasks) {
  const error = new Error(`listActive: more than ${maxTasks} candidate tasks; raise createPrismaStorage's maxTasks or retire old tasks`);
  error.code = "task-capacity-exceeded";
  return error;
}

function createDecisionLogPort(prisma) {
  return Object.freeze({
    async claim(record, { token } = {}) {
      assertClaim(record, token);
      try {
        await prisma.decision.create({ data: mapDecisionForCreate(record, token) });
        return Object.freeze({ claimed: true });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        const existing = await prisma.decision.findUnique({
          where: { decisionId: record.decisionId },
          select: { claimToken: true },
        });
        return Object.freeze({ claimed: existing?.claimToken === token });
      }
    },
    async complete(decisionId, result = {}) {
      assertDecisionId(decisionId, "complete");
      assertCompletionResult(result);
      const updated = await transitionClaimedDecision(prisma, decisionId, "completed", result);
      return Object.freeze({ applied: updated.count === 1 });
    },
    async fail(decisionId, result = {}) {
      assertDecisionId(decisionId, "fail");
      assertFailureResult(result);
      const updated = await transitionClaimedDecision(prisma, decisionId, "failed", result);
      return Object.freeze({ applied: updated.count === 1 });
    },
    async recordGap({ from, to, tickId } = {}) {
      assertDate("recordGap: from", from);
      assertDate("recordGap: to", to);
      if (from >= to) throw new TypeError("recordGap: from must be before to");
      if (typeof tickId !== "string" || tickId === "") throw new TypeError("recordGap: tickId is required");
      await prisma.gap.create({ data: { from, to, tickId } });
    },
  });
}

function mapDecisionForCreate(record, token) {
  return {
    decisionId: record.decisionId,
    state: record.state,
    claimToken: token,
    claimedAt: new Date(record.claimedAt),
    record: freezeCopy({ ...record, claimToken: token }),
  };
}

async function transitionClaimedDecision(prisma, decisionId, state, result) {
  const existing = await prisma.decision.findUnique({ where: { decisionId }, select: { record: true } });
  if (existing === null) return { count: 0 };
  return prisma.decision.updateMany({
    where: { decisionId, state: "claimed" },
    data: {
      state,
      finishedAt: result.finishedAt,
      ...(state === "failed" ? { error: freezeCopy(result.error) } : {}),
      record: mergeTerminalRecord(existing.record, state, result),
    },
  });
}

function mergeTerminalRecord(record, state, result) {
  return {
    ...freezeCopy(record),
    state,
    finishedAt: result.finishedAt,
    ...(state === "completed" ? { result: { delivery: freezeCopy(result.delivery ?? null) } } : { error: freezeCopy(result.error) }),
  };
}

function mapParticipant(row) {
  return freezeCopy({ id: row.id, timeZone: row.timeZone, ...(row.attributes === null ? {} : { attributes: row.attributes }) });
}

function assertPrismaClient(prisma) {
  if (prisma === null || typeof prisma !== "object" || !isPrismaDelegate(prisma, "participant") || !isPrismaDelegate(prisma, "task") || !isPrismaDelegate(prisma, "decision") || !isPrismaDelegate(prisma, "gap")) {
    throw new TypeError("createPrismaStorage: prisma must provide participant, task, decision, and gap delegates");
  }
}

function isPrismaDelegate(prisma, name) {
  const requiredMethods = Object.freeze({
    participant: ["findMany"],
    task: ["findMany"],
    decision: ["create", "findUnique", "updateMany"],
    gap: ["create"],
  });
  return requiredMethods[name].every((method) => typeof prisma[name]?.[method] === "function");
}

function assertMaxTasks(maxTasks) {
  if (!Number.isInteger(maxTasks) || maxTasks < 1 || maxTasks > MAX_TASKS_LIMIT) {
    throw new TypeError(`createPrismaStorage: maxTasks must be an integer from 1 to ${MAX_TASKS_LIMIT}`);
  }
}

function assertPageRequest(cursor, limit) {
  if (cursor !== null && (typeof cursor !== "string" || cursor === "")) throw new TypeError("iterate: cursor must be a string or null");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) throw new TypeError("iterate: limit must be an integer from 1 to 1000");
}

function assertClaim(record, token) {
  assertDecisionId(record?.decisionId, "claim");
  if (!CLAIMABLE_STATES.has(record.state)) throw new TypeError(`claim: state must be claimed or unavailable, got ${record.state}`);
  assertIsoInstant("claim: scheduledAt", record.scheduledAt);
  assertIsoInstant("claim: claimedAt", record.claimedAt);
  if (typeof token !== "string" || token === "") throw new TypeError("claim: token is required");
}

function assertCompletionResult(result) {
  assertIsoInstant("complete: finishedAt", result.finishedAt);
  assertCloneable("complete: delivery", result.delivery ?? null);
}

function assertFailureResult(result) {
  assertIsoInstant("fail: finishedAt", result.finishedAt);
  if (result.error === null || typeof result.error !== "object") throw new TypeError("fail: error is required");
  assertCloneable("fail: error", result.error);
}

function assertDecisionId(decisionId, method) {
  if (typeof decisionId !== "string" || decisionId === "") throw new TypeError(`${method}: decisionId is required`);
}

function assertIsoInstant(name, value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${name} must be an ISO instant`);
}

function assertDate(name, value) {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) throw new TypeError(`${name} must be a valid Date`);
}

function assertCloneable(name, value) {
  try {
    structuredClone(value);
  } catch (error) {
    throw new TypeError(`${name} must be structured-cloneable: ${error.message}`);
  }
}

function isUniqueConstraintError(error) {
  return typeof error === "object" && error !== null && error.code === "P2002";
}

function freezeCopy(value) {
  return deepFreeze(structuredClone(value));
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
