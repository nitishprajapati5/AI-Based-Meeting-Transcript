/**
 * Zod Validation Schemas
 * Centralized validation schemas for all API requests
 */

import { z } from "zod";

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters").trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

export const forgotPassword = z.object({
  email: z.string(),
});

export const resetPasswordWithTokenSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Meeting Schemas
export const createMeetingSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters")
    .trim(),
  date: z.string().min(1, "Date is required"),
  participants: z
    .array(z.string().email("Each participant must have a valid email"))
    .min(1, "At least one participant is required"),
  transcript: z
    .string()
    .min(10, "Transcript must be at least 10 characters")
    .max(50000, "Transcript must not exceed 50,000 characters")
    .optional()
    .nullable(),
  type: z.string().optional(),
  summaryLength: z.string().optional(),
  language: z.string().optional(),
  template: z.string().optional(),
  customPrompt: z.string().optional(),
  isMeetingPublished: z.boolean().optional(),
});

export const updateMeetingSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters")
    .trim()
    .optional(),
  date: z.string().optional(),
  participants: z.array(z.string().email("Each participant must have a valid email")).optional(),
  transcript: z
    .string()
    .min(10, "Transcript must be at least 10 characters")
    .max(50000, "Transcript must not exceed 50,000 characters")
    .optional()
    .nullable(),
  type: z.string().optional(),
  summaryLength: z.string().optional(),
  language: z.string().optional(),
  template: z.string().optional(),
  customPrompt: z.string().optional(),
  isMeetingPublished: z.boolean().optional(),
});

export const meetingQuerySchema = z.object({
  page: z.preprocess((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && /^\d+$/.test(val)) return Number(val);
    return undefined;
  }, z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && /^\d+$/.test(val)) return Number(val);
    return undefined;
  }, z.number().int().min(1).default(1)),
  search: z.string().max(100, "Search query too long").optional(),
  type: z.enum(["meeting", "standup", "presentation", "workshop", "other"]).optional(),
  sortBy: z.enum(["date", "createdAt", "title"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  isArchived: z.preprocess((val) => {
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  isDeleted: z.preprocess((val) => {
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});

// Action Item Schemas
export const createActionItemSchema = z.object({
  task: z.string().min(1, "Task is required").max(500, "Task must not exceed 500 characters").trim(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  meetingId: z.string().min(1, "Meeting ID is required"),
});

export const updateActionItemSchema = z.object({
  task: z.string().min(1, "Task is required").max(500, "Task must not exceed 500 characters").trim().optional(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
});

export const actionItemQuerySchema = z.object({
  page: z.preprocess((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && /^\d+$/.test(val)) return Number(val);
    return undefined;
  }, z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && /^\d+$/.test(val)) return Number(val);
    return undefined;
  }, z.number().int().min(1).default(1)),
  status: z.string().optional(),
  priority: z.string().optional(),
  meetingId: z.string().optional(),
  sortBy: z.string().default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ID Validation
export const idSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const chatValidationSchema = z.object({
  question: z.string().min(1, "Question must not be empty"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional(),
});

export const createCloneSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters")
    .trim(),
  date: z.string().min(1, "Date is required"),
  participants: z
    .array(z.string().email("Each participant must have a valid email"))
    .min(1, "At least one participant is required"),
  transcript: z
    .string()
    .min(10, "Transcript must be at least 10 characters")
    .max(50000, "Transcript must not exceed 50,000 characters")
    .optional()
    .nullable(),
  type: z.string().optional(),
  summaryLength: z.string().optional(),
  language: z.string().optional(),
  template: z.string().optional(),
  customPrompt: z.string().optional(),
  isMeetingPublished: z.boolean().optional(),
});

// Detailed Meeting and Summary Schemas
export const keyDecisionSchema = z.object({
  category: z.string(),
  decision: z.string(),
  context: z.string().optional(),
});

export const actionItemSchema = z.object({
  task: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["Open", "In Progress", "Blocked", "Completed", "Pending"]),
});

export const speakerAnalyticsSchema = z.object({
  name: z.string(),
  talkTimePercentage: z.number(),
  wordCount: z.number(),
});

export const sentimentAnalysisSchema = z.object({
  overallTone: z.enum(["Positive", "Neutral", "Concerned", "Heated"]),
  score: z.number(),
  breakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    concerned: z.number(),
    heated: z.number(),
  }),
});

export const executiveSummaryDetailsSchema = z.object({
  strategicImpact: z.string(),
  financialOrTimelineRisks: z.array(z.string()),
  executiveRecommendations: z.array(z.string()),
});

export const developerTaskDetailsSchema = z.object({
  codeDeliverables: z.array(z.string()),
  architecturalChanges: z.array(z.string()),
  apiContractsAndDependencies: z.array(z.string()),
  technicalBlockers: z.array(z.string()),
});

export const technicalDecisionDetailsSchema = z.object({
  systemArchitectureChoices: z.array(z.string()),
  techStackTradeoffs: z.array(z.string()),
  engineeringConstraints: z.array(z.string()),
});

export const salesQualificationDetailsSchema = z.object({
  clientPainPoints: z.array(z.string()),
  budgetAndAuthority: z.string(),
  timelineExpectations: z.string(),
  nextSalesSteps: z.array(z.string()),
});

export const meetingSummarySchema = z.object({
  purpose: z.string(),
  discussionPoints: z.array(z.string()),
  majorOutcomes: z.array(z.string()),
  importantConcerns: z.array(z.string()),
  unansweredQuestions: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()),
  keyDecisions: z.array(keyDecisionSchema).optional(),
  actionItems: z.array(actionItemSchema).optional(),
  speakerAnalytics: z.array(speakerAnalyticsSchema).optional(),
  sentimentAnalysis: sentimentAnalysisSchema.optional(),
  templateStyle: z.enum(["Standard", "Executive", "Developer", "Technical", "Sales"]).optional(),
  executiveDetails: executiveSummaryDetailsSchema.optional(),
  developerDetails: developerTaskDetailsSchema.optional(),
  technicalDetails: technicalDecisionDetailsSchema.optional(),
  salesDetails: salesQualificationDetailsSchema.optional(),
});

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.string(),
  participants: z.array(z.string().email()),
  transcript: z.string(),
  summary: meetingSummarySchema.nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  isMeetingPublished: z.boolean().default(false),
  sharePassword: z.string().nullable().optional(),
  shareExpiresAt: z.string().or(z.date()).nullable().optional(),
  isDeleted: z.boolean().default(false),
  isDeletedAt: z.string().or(z.date()).nullable().optional(),
  isArchived: z.boolean().default(false),
  isArchivedAt: z.string().or(z.date()).nullable().optional(),
  isPinned: z.boolean().default(false),
  hasChunks: z.boolean().optional(),
});

export const cloneMeetingSchema = z.object({
  meeting: meetingSchema,
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  statusGroup: z.enum(["all", "2xx", "3xx", "4xx", "5xx", "errors"]).optional().default("all"),
  method: z.string().optional(),
  search: z.string().optional(),
  serviceId: z.string().optional(),
});

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type MeetingQueryInput = z.infer<typeof meetingQuerySchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
export type ActionItemQueryInput = z.infer<typeof actionItemQuerySchema>;
export type ChatValidationInput = z.infer<typeof chatValidationSchema>;
export type MeetingInput = z.infer<typeof meetingSchema>;
export type MeetingSummaryInput = z.infer<typeof meetingSummarySchema>;
export type CloneMeetingInput = z.infer<typeof cloneMeetingSchema>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// Series Schemas
export const createSeriesSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200).trim(),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g. #6366f1)")
    .optional(),
  recurrenceLabel: z
    .enum(["Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Ad-hoc"])
    .optional()
    .default("Weekly"),
});

export const updateSeriesSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  recurrenceLabel: z.enum(["Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Ad-hoc"]).optional(),
});

export const assignMeetingToSeriesSchema = z.object({
  meetingId: z.string().min(1, "meetingId is required"),
  seriesId: z.string().min(1, "seriesId is required"),
  occurrence: z.number().int().positive().optional(),
});

export const removeMeetingFromSeriesSchema = z.object({
  meetingId: z.string().min(1, "meetingId is required"),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type AssignMeetingToSeriesInput = z.infer<typeof assignMeetingToSeriesSchema>;
