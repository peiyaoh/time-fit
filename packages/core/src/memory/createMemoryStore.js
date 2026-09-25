/**
 * In-memory implementation of the participants, tasks, and decisionLog ports, for tests,
 * demos, and simple single-process reminders. **Not for research data**: decision records
 * are kept only inside a retention window and a record cap (ADR 0002, plan Stage C2).
 *
 * Everything is copied on the way in and on the way out, so callers never share mutable
 * state with the store.
 */

const MILLISECONDS_PER_MINUTE = 60_000;
const DEFAULT_RETENTION_MINUTES = 65; // default catch-up window (5 min) + 1 h margin
const DEFAULT_MAX_RECORDS = 10_000;
const MAX_GAPS = 1_000;
const CLAIMABLE_STATES = new Set(["claimed", "unavailable"]);

/**
 * @param {{ participants?: object[], tasks?: object[], retentionMinutes?: number, maxRecords?: number }} [options]
 *   retentionMinutes must be at least the engine's catchUpWindowMinutes, or restarts could re-deliver.
 */
export function createMemoryStore({
  participants = [],
  tasks = [],
  retentionMinutes = DEFAULT_RETENTION_MINUTES,
  maxRecords = DEFAULT_MAX_RECORDS,
} = {}) {
  assertArray("participants", participants);
  assertArray("tasks", tasks);
  assertPositiveInteger("retentionMinutes", retentionMinutes);
  assertPositiveInteger("maxRecords", maxRecords);
  return Object.freeze({
    participants: createParticipantsPort(participants),
    tasks: createTasksPort(tasks),
    decisionLog: createDecisionLog({ retentionMilliseconds: retentionMinutes * MILLISECONDS_PER_MINUTE, maxRecords }),
  });
}

function createParticipantsPort(initialParticipants) {
  let participants = initialParticipants.map(copy);
  return Object.freeze({
    async iterate({ cursor, limit }) {
      assertPositiveInteger("limit", limit);
      const offset = cursor === null ? 0 : parseCursor(cursor);
      const items = participants.slice(offset, offset + limit).map(copy);
      const nextOffset = offset + items.length;
      return { items, nextCursor: nextOffset < participants.length ? String(nextOffset) : null };
    },
    add(participant) {
      participants = [...participants, copy(participant)];
    },
  });
}

function createTasksPort(initialTasks) {
  let tasks = initialTasks.map(copy);
  return Object.freeze({
    async listActive() {
      return tasks.map(copy);
    },
    list() {
      return tasks.map(copy);
    },
    /** Adds the spec, or replaces the one with the same id. */
    upsert(spec) {
      const incoming = copy(spec);
      const index = tasks.findIndex((task) => task.id === incoming.id);
      tasks = index === -1 ? [...tasks, incoming] : tasks.map((task, i) => (i === index ? incoming : task));
    },
    remove(taskId) {
      tasks = tasks.filter((task) => task.id !== taskId);
    },
  });
}

function createDecisionLog({ retentionMilliseconds, maxRecords }) {
  const records = new Map();
  let gaps = [];

  const storeRecord = (record) => records.set(record.decisionId, Object.freeze(record));
  const transition = (decisionId, change) => {
    const existing = records.get(decisionId);
    if (existing === undefined || existing.state !== "claimed") return { applied: false };
    storeRecord({ ...existing, ...change });
    return { applied: true };
  };
  const prune = (newestScheduledAt) => {
    const cutoff = newestScheduledAt - retentionMilliseconds;
    [...records.values()].filter((record) => Date.parse(record.scheduledAt) < cutoff).forEach((record) => records.delete(record.decisionId));
    [...records.keys()].slice(0, Math.max(0, records.size - maxRecords)).forEach((decisionId) => records.delete(decisionId));
  };

  return Object.freeze({
    async claim(record, { token }) {
      assertClaimable(record, token);
      const existing = records.get(record.decisionId);
      if (existing !== undefined) return { claimed: existing.claimToken === token };
      storeRecord({ ...copy(record), claimToken: token });
      prune(Date.parse(record.scheduledAt));
      return { claimed: true };
    },
    async complete(decisionId, { finishedAt, delivery }) {
      return transition(decisionId, { state: "completed", finishedAt, result: { delivery: copy(delivery ?? null) } });
    },
    async fail(decisionId, { finishedAt, error }) {
      return transition(decisionId, { state: "failed", finishedAt, error: copy(error) });
    },
    async recordGap({ from, to, tickId }) {
      gaps = [...gaps, Object.freeze({ from: from.toISOString(), to: to.toISOString(), tickId })].slice(-MAX_GAPS);
    },
    /** @returns {object | undefined} a copy of one record */
    get(decisionId) {
      const record = records.get(decisionId);
      return record === undefined ? undefined : copy(record);
    },
    /** @returns {object[]} copies of all retained records, oldest first */
    records() {
      return [...records.values()].map(copy);
    },
    /** @returns {object[]} recorded missed windows, oldest first */
    gaps() {
      return gaps.map(copy);
    },
  });
}

function assertClaimable(record, token) {
  if (typeof record?.decisionId !== "string" || record.decisionId === "") throw new TypeError("claim: record.decisionId is required");
  if (!CLAIMABLE_STATES.has(record.state)) throw new TypeError(`claim: state must be "claimed" or "unavailable", got ${record.state}`);
  if (Number.isNaN(Date.parse(record.scheduledAt))) throw new TypeError("claim: record.scheduledAt must be an ISO instant");
  if (typeof token !== "string" || token === "") throw new TypeError("claim: token is required");
}

function parseCursor(cursor) {
  const offset = Number(cursor);
  if (typeof cursor !== "string" || !Number.isInteger(offset) || offset < 0) throw new TypeError(`iterate: invalid cursor "${cursor}"`);
  return offset;
}

function copy(value) {
  return structuredClone(value);
}

function assertArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`createMemoryStore: ${name} must be an array`);
}

function assertPositiveInteger(name, value) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
}
