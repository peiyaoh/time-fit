// Type-checked by scripts/verify-packed-quickstart.sh against the packed tarballs (tsc --strict).

import { createTimeEngine, type ActionPlugin, type DecisionRecord, type PluginContext, type TickResult } from "@time-fit/core";
import { createMemoryStore } from "@time-fit/core/memory";
import { decisionLogConformanceChecks } from "@time-fit/core/testing";
import { createPrismaStorage } from "@time-fit/storage-prisma";
import { desktopNotificationAction } from "@time-fit/integrations/desktop";
import { twilioSmsAction } from "@time-fit/integrations/twilio";
import { mailjetEmailAction } from "@time-fit/integrations/mailjet";

declare const ctx: PluginContext;
const checkpoints = [{ id: "morning", time: "09:00" }];
const store = createMemoryStore({ participants: [{ id: "ada", timeZone: "UTC", attributes: { phone: "+15550002" } }] });
const sms = twilioSmsAction({ client: { messages: { create: async () => ({ sid: "SM1" }) } }, from: "+15550001", phonePath: "attributes.phone" });
const email = mailjetEmailAction({ client: { post: () => ({ request: async () => ({}) }) }, from: { email: "study@example.org", name: "Study" } });
const desktop = desktopNotificationAction({ notifier: { notify: (_options, callback) => { callback(null, "shown"); return undefined; } } });
const custom: ActionPlugin<{ text: string }> = {
  type: "custom",
  execute: async (params, context) => ({ ok: true, delivery: { text: params.text, decisionId: context.decisionId } }),
};

const engine = createTimeEngine({
  storage: store,
  tasks: [{ id: "nudge", scope: "participant", checkpoints, outcomes: [{ id: "send", probability: 1, action: { type: "twilio-sms", body: "hi" } }] }],
  actions: [sms, email, desktop, custom],
  options: { concurrency: 2 },
});
const result: TickResult = await engine.tick(new Date("2026-09-22T09:00:00.000Z"));
if ("skipped" in result) {
  const skipped: "in-flight" = result.skipped;
  void skipped;
} else {
  const completed: number = result.counts.completed;
  const stage: "tasks" | "participants" | undefined = result.failedStage;
  void [completed, stage];
}
const records: DecisionRecord[] = store.decisionLog.records();
const page = await store.participants.iterate({ cursor: null, limit: 10 });
const nextCursor: string | null = page.nextCursor;
const smsResult = await sms.execute({ body: "hi" }, ctx);
if (!smsResult.ok) void smsResult.error.code;

const rows = async () => [];
const prismaStorage = createPrismaStorage({
  prisma: { participant: { findMany: rows }, task: { findMany: rows }, decision: { create: rows, findUnique: async () => null, updateMany: async () => ({ count: 0 }) }, gap: { create: rows } },
  maxTasks: 1000,
});
const prismaEngine = createTimeEngine({ storage: prismaStorage, actions: [sms] });
const active = await prismaStorage.tasks.listActive(new Date(), { windowFrom: new Date(0) });
const systemOnly = createTimeEngine({
  decisionLog: store.decisionLog,
  tasks: [{ id: "daily", scope: "system", timeZone: "UTC", checkpoints, outcomes: [{ id: "none", probability: 1, action: null }] }],
});
void [records, nextCursor, prismaEngine, active, systemOnly, decisionLogConformanceChecks];

// @ts-expect-error unknown top-level field
createTimeEngine({ storage: store, typo: true });
// @ts-expect-error unknown engine option
createTimeEngine({ storage: store, options: { concurency: 2 } });
// @ts-expect-error no decision log, directly or in storage
createTimeEngine({ participants: store.participants, tasks: store.tasks });
// @ts-expect-error storage without a decision log
createTimeEngine({ storage: { participants: store.participants, tasks: store.tasks } });
// @ts-expect-error Twilio params need a string body
await sms.execute({ message: 1 }, ctx);
// @ts-expect-error a tick result must be narrowed before reading counts
void result.counts;
// @ts-expect-error nextCursor can be null
const cursor: string = page.nextCursor;
// @ts-expect-error maxTasks is a number
createPrismaStorage({ prisma: prismaStorage as never, maxTasks: "500" });
void cursor;
