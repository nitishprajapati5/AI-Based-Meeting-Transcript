import { pgTable, text, timestamp, varchar, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";

/**
 * Users Table
 * Stores user account information with authentication details
 */
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    isDeleted: boolean().default(false),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email), index("users_created_at_idx").on(table.createdAt)]
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
