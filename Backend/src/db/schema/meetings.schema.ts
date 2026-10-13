import { pgTable, text, timestamp, varchar, jsonb, index, boolean, integer } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export type SummaryLength = "Short" | "Medium" | "Long";
export type SummaryTemplate = "Standard" | "Executive" | "Developer" | "Technical" | "Sales";

export interface KeyDecision {
  category: string;
  decision: string;
  context?: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Blocked" | "Completed" | "Pending";
}

export interface SpeakerAnalytics {
  name: string;
  talkTimePercentage: number;
  wordCount: number;
}

export interface SentimentAnalysis {
  overallTone: "Positive" | "Neutral" | "Concerned" | "Heated";
  score: number;
  breakdown: {
    positive: number;
    neutral: number;
    concerned: number;
    heated: number;
  };
}

export interface ExecutiveSummaryDetails {
  strategicImpact: string;
  financialOrTimelineRisks: string[];
  executiveRecommendations: string[];
}

export interface DeveloperTaskDetails {
  codeDeliverables: string[];
  architecturalChanges: string[];
  apiContractsAndDependencies: string[];
  technicalBlockers: string[];
}

export interface TechnicalDecisionDetails {
  systemArchitectureChoices: string[];
  techStackTradeoffs: string[];
  engineeringConstraints: string[];
}

export interface SalesQualificationDetails {
  clientPainPoints: string[];
  budgetAndAuthority: string;
  timelineExpectations: string;
  nextSalesSteps: string[];
}

export interface MeetingSummary {
  purpose: string;
  discussionPoints: string[];
  majorOutcomes: string[];
  importantConcerns: string[];
  unansweredQuestions?: string[];
  nextSteps: string[];
  keyDecisions?: KeyDecision[];
  actionItems?: ActionItem[];
  speakerAnalytics?: SpeakerAnalytics[];
  sentimentAnalysis?: SentimentAnalysis;
  templateStyle?: SummaryTemplate;
  executiveDetails?: ExecutiveSummaryDetails;
  developerDetails?: DeveloperTaskDetails;
  technicalDetails?: TechnicalDecisionDetails;
  salesDetails?: SalesQualificationDetails;
}

/**
 * Meeting Series Table
 * Groups related recurring meetings into a named series
 */
export const meetingSeries = pgTable(
  "meeting_series",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").default(""),
    color: text("color").notNull().default("#6366f1"),
    recurrenceLabel: text("recurrence_label").notNull().default("Weekly"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("meeting_series_user_id_idx").on(table.userId),
    index("meeting_series_created_at_idx").on(table.createdAt),
  ]
);

export type MeetingSeriesRecord = typeof meetingSeries.$inferSelect;
export type NewMeetingSeriesRecord = typeof meetingSeries.$inferInsert;

/**
 * Meetings Table
 * Stores meeting records with transcripts, participants, and AI-generated summaries
 */
export const meetings = pgTable(
  "meetings",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    type: text("type").notNull().default("meeting"),
    participants: jsonb("participants").$type<string[]>().notNull(),
    transcript: text("transcript").default(""),
    summary: jsonb("summary").$type<MeetingSummary>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    isMeetingPublished: boolean("is_meeting_published").notNull().default(false),
    sharePassword: text("share_password"),
    shareExpiresAt: timestamp("share_expires_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isDeletedAt: timestamp("is_deleted_at", { withTimezone: true }),
    isArchived: boolean("is_archived").notNull().default(false),
    isArchivedAt: timestamp("is_archived_at", { withTimezone: true }),
    isPinned: boolean("is_pinned").notNull().default(false),
    seriesId: varchar("series_id", { length: 255 }).references(() => meetingSeries.id, { onDelete: "set null" }),
    seriesOccurrence: integer("series_occurrence"),
  },
  (table) => [
    index("meetings_date_idx").on(table.date),
    index("meetings_type_idx").on(table.type),
    index("meetings_created_at_idx").on(table.createdAt),
    index("meetings_archived_created_idx").on(table.isArchived, table.isDeleted, table.createdAt),
    index("meetings_participants_gin_idx").using("gin", table.participants),
    index("meetings_series_id_idx").on(table.seriesId),
  ]
);

export type MeetingRecord = typeof meetings.$inferSelect;
export type NewMeetingRecord = typeof meetings.$inferInsert;
