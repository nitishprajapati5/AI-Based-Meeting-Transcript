import { pgTable, text, timestamp, varchar, jsonb, index, boolean, integer, customType } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { meetings } from "./meetings.schema";

/**
 * User Settings Table
 */
export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  summaryLength: text("summary_length").notNull().default("Medium"),
  template: text("template").notNull().default("Standard"),
  customPrompt: text("custom_prompt")
    .notNull()
    .default("Focus heavily on technical decisions, code deliverables, and explicit action item due dates."),
  autoExtractActionItems: boolean("auto_extract_action_items").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  slackWebhookUrl: text("slack_webhook_url").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type NewUserSettingsRecord = typeof userSettings.$inferInsert;

/**
 * User Sessions Table
 */
export const userSessions = pgTable("user_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull().default("127.0.0.1"),
  device: text("device").notNull().default("Desktop"),
  browser: text("browser").notNull().default("Chrome"),
  os: text("os").notNull().default("Mac OS X"),
  location: text("location").default("Local Session"),
  isCurrent: boolean("is_current").notNull().default(true),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type UserSessionRecord = typeof userSessions.$inferSelect;
export type NewUserSessionRecord = typeof userSessions.$inferInsert;

/**
 * Notifications Table
 */
export const notifications = pgTable(
  "notifications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("general"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt),
  ]
);

export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotificationRecord = typeof notifications.$inferInsert;

const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value
        .replace(/[\[\]]/g, "")
        .split(",")
        .map(Number);
    }
    return value as number[];
  },
});

/**
 * Meeting Chunks Table for pgvector RAG system
 */
export const meetingChunks = pgTable(
  "meeting_chunks",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    meetingId: varchar("meeting_id", { length: 255 })
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("meeting_chunks_meeting_id_idx").on(table.meetingId)]
);

export type MeetingChunkRecord = typeof meetingChunks.$inferSelect;
export type NewMeetingChunkRecord = typeof meetingChunks.$inferInsert;

/**
 * User Memory Embeddings Table
 */
export const userMemoryEmbeddings = pgTable(
  "user_memory_embeddings",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: varchar("source_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("user_memory_embeddings_user_id_idx").on(table.userId),
    index("user_memory_embeddings_user_source_idx").on(table.userId, table.sourceType),
    index("user_memory_embeddings_source_id_idx").on(table.sourceId),
  ]
);

export type UserMemoryEmbeddingRecord = typeof userMemoryEmbeddings.$inferSelect;
export type NewUserMemoryEmbeddingRecord = typeof userMemoryEmbeddings.$inferInsert;

/**
 * Chat Sessions Table
 */
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Chat Session"),
    sessionType: text("session_type").notNull().default("global"),
    meetingId: varchar("meeting_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("chat_sessions_user_id_idx").on(table.userId),
    index("chat_sessions_created_at_idx").on(table.createdAt),
  ]
);

export type ChatSessionRecord = typeof chatSessions.$inferSelect;
export type NewChatSessionRecord = typeof chatSessions.$inferInsert;

/**
 * Chat Messages Table
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    sessionId: varchar("session_id", { length: 255 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<any[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("chat_messages_session_id_idx").on(table.sessionId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ]
);

export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type NewChatMessageRecord = typeof chatMessages.$inferInsert;

/**
 * Request Logs Table
 */
export const requestLogs = pgTable(
  "request_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    duration: text("duration"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
    serviceId: text("service_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("request_logs_created_at_idx").on(table.createdAt),
    index("request_logs_user_id_idx").on(table.userId),
    index("request_logs_service_id_idx").on(table.serviceId),
  ]
);

export type RequestLogRecord = typeof requestLogs.$inferSelect;
export type NewRequestLogRecord = typeof requestLogs.$inferInsert;
