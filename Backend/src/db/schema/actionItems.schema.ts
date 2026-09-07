import { pgTable, text, timestamp, varchar, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { meetings } from "./meetings.schema";
import { users } from "./users.schema";

export interface SubTaskRecord {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Action Items Table
 * Stores tasks extracted from meetings with ownership, priority, and status tracking
 */
export const actionItems = pgTable(
  "action_items",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    meetingId: varchar("meeting_id", { length: 255 })
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    task: text("task").notNull(),
    owner: text("owner").default("Unassigned"),
    dueDate: text("due_date").default("Not specified"),
    priority: text("priority").default("Medium"),
    status: text("status").default("Pending"),
    subtasks: jsonb("subtasks").$type<SubTaskRecord[]>().default([]),
    dependsOn: jsonb("depends_on").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    isArchived: boolean("is_archived").notNull().default(false),
    isArchivedAt: timestamp("is_archived_at", { withTimezone: true }),
  },
  (table) => [
    index("action_items_meeting_id_idx").on(table.meetingId),
    index("action_items_user_id_idx").on(table.userId),
    index("action_items_owner_idx").on(table.owner),
    index("action_items_status_idx").on(table.status),
    index("action_items_priority_idx").on(table.priority),
    index("action_items_due_date_idx").on(table.dueDate),
    index("action_items_created_at_idx").on(table.createdAt),
    index("action_items_meeting_status_idx").on(table.meetingId, table.status),
    index("action_items_owner_status_idx").on(table.owner, table.status),
    index("action_items_archived_created_idx").on(table.isArchived, table.createdAt),
  ]
);

export type ActionItemRecord = typeof actionItems.$inferSelect;
export type NewActionItemRecord = typeof actionItems.$inferInsert;
