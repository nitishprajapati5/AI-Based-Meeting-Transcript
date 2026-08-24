import { pgTable, text, timestamp, varchar, jsonb, index, boolean } from "drizzle-orm/pg-core";

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
  },
  (table) => [
    index("meetings_date_idx").on(table.date),
    index("meetings_type_idx").on(table.type),
    index("meetings_created_at_idx").on(table.createdAt),
    index("meetings_archived_created_idx").on(table.isArchived, table.isDeleted, table.createdAt),
    index("meetings_participants_gin_idx").using("gin", table.participants),
  ]
);

export type MeetingRecord = typeof meetings.$inferSelect;
export type NewMeetingRecord = typeof meetings.$inferInsert;
