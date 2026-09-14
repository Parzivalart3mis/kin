import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const frequencyPeriodEnum = pgEnum("frequency_period", [
  "week",
  "fortnight",
  "month",
  "quarter",
]);

export const callTypeEnum = pgEnum("call_type", ["completed", "attempt"]);

/** Mirror of the Clerk user. `clerkId` is the join key; everything else is app-owned. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    /** IANA zone the user lives in — drives the midnight reset and the cron send time. */
    timezone: text("timezone").notNull().default("UTC"),
    /** "HH:mm" in the user's own timezone. */
    notificationTime: text("notification_time").notNull().default("09:00"),
    /** Local "YYYY-MM-DD" of the last daily push — guarantees at most one a day. */
    lastNotifiedOn: text("last_notified_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_clerk_id_idx").on(t.clerkId)],
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    countryCode: text("country_code").notNull(),
    /** IANA zone of the person, e.g. "Asia/Kolkata". */
    timezone: text("timezone").notNull(),
    frequencyCount: integer("frequency_count").notNull(),
    frequencyPeriod: frequencyPeriodEnum("frequency_period").notNull(),
    lastConversationAt: timestamp("last_conversation_at", { withTimezone: true }),
    /**
     * Computed on write from `lastConversationAt + interval`. Never accumulates:
     * a completed call always resets it from *that* call's timestamp.
     * A person with no conversation yet is due from the moment they're added.
     */
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("people_user_next_due_idx").on(t.userId, t.nextDueAt)],
);

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: callTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    /** Idempotency key from the offline outbox; a replayed request is a no-op. */
    clientId: text("client_id"),
  },
  (t) => [
    index("call_logs_person_occurred_idx").on(t.personId, sql`${t.occurredAt} desc`),
    uniqueIndex("call_logs_client_id_idx").on(t.clientId).where(sql`${t.clientId} is not null`),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint)],
);

export const usersRelations = relations(users, ({ many }) => ({
  people: many(people),
  callLogs: many(callLogs),
  pushSubscriptions: many(pushSubscriptions),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  user: one(users, { fields: [people.userId], references: [users.id] }),
  callLogs: many(callLogs),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  person: one(people, { fields: [callLogs.personId], references: [people.id] }),
  user: one(users, { fields: [callLogs.userId], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type FrequencyPeriod = (typeof frequencyPeriodEnum.enumValues)[number];
export type CallType = (typeof callTypeEnum.enumValues)[number];
