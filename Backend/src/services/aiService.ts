import { gateway, generateObject } from "ai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { z } from "zod";
import { MeetingSummary, KeyDecision, ActionItem, SummaryLength, SummaryTemplate } from "../db/schema";
import { buildMeetingSummaryPrompt } from "../utils/aiPrompts";
import dotenv from "dotenv";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { meetingChunks } from "../db/schema";
import { sql, eq } from "drizzle-orm";
import db from "../db";
import { embedMany } from "ai";

dotenv.config();

/**
 * Helper to sanitize error messages, masking API keys and sensitive credentials
 */
function sanitizeError(err: any): string {
  if (!err) return "";
  let msg = typeof err === "string" ? err : err.message || JSON.stringify(err);

  const keysToMask = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GEMINI_FALL_BACK_KEY,
  ].filter(Boolean) as string[];

  keysToMask.forEach((key) => {
    if (key && key.length > 5) {
      msg = msg.split(key).join("[API_KEY_MASKED]");
    }
  });

  return msg.replace(/AIzaSy[A-Za-z0-9_-]{35}/g, "[API_KEY_MASKED]").replace(/[a-zA-Z0-9_-]{39,40}/g, "[KEY_MASKED]");
}

/**
 * Rotation Policy Implementation (RPI):
 * Parses process.env.GEMINI_API_KEYS as a comma-separated string of API keys.
 * Cleans quotes, whitespace, and de-duplicates key values.
 */
function getRotationPolicyApiKeys(): string[] {
  const rawKeysString = process.env.GEMINI_API_KEYS;
  if (!rawKeysString) return [];

  const keys = rawKeysString
    .split(",")
    .map((key) => key.replace(/^["']|["']$/g, "").trim())
    .filter((key) => key.length > 0);

  return Array.from(new Set(keys));
}

export const keyDecisionSchema = z.object({
  category: z
    .string()
    .describe(
      "Category of the decision (e.g., Technology/Platform, Feature Approval/Rejection, Timeline Agreed, Scope Change, Budget/Staffing, Responsibility Assigned, General Decision)."
    ),
  decision: z.string().describe("Clear, concise statement of the decision made during the meeting."),
  context: z
    .string()
    .describe(
      "Brief context, background, or rationale for the decision if mentioned. Use empty string '' if not mentioned."
    ),
});

export const actionItemSchema = z.object({
  task: z.string().describe("Clear action task description extracted from the transcript."),
  owner: z.string().describe("Name of the person assigned to the task. Use 'Unassigned' if not mentioned."),
  dueDate: z
    .string()
    .describe(
      "Due date string (e.g. YYYY-MM-DD or relative like 'Next Friday'). Use 'Not specified' if not mentioned."
    ),
  priority: z
    .enum(["Low", "Medium", "High", "Urgent"])
    .describe("Inferred priority level based on context (default 'Medium')."),
  status: z
    .enum(["Open", "In Progress", "Blocked", "Completed", "Pending"])
    .describe("Current status of the task (default 'Open')."),
});

export const speakerAnalyticsSchema = z.object({
  name: z.string().describe("Name of speaker identified in dialogue (e.g. 'John', 'Sarah') or 'Participant 1'."),
  talkTimePercentage: z
    .number()
    .describe("Percentage of total talk-time/dialogue contributed by this speaker (0-100)."),
  wordCount: z.number().describe("Estimated total word count spoken by this speaker in transcript."),
});

export const sentimentAnalysisSchema = z.object({
  overallTone: z
    .enum(["Positive", "Neutral", "Concerned", "Heated"])
    .describe("Overall dominant emotional tone of the meeting context."),
  score: z.number().describe("Positivity score from 0 (very negative/heated) to 100 (extremely positive/productive)."),
  breakdown: z.object({
    positive: z.number().describe("Percentage of discussion with positive tone (0-100)."),
    neutral: z.number().describe("Percentage of discussion with neutral tone (0-100)."),
    concerned: z.number().describe("Percentage of discussion with concerned/risky tone (0-100)."),
    heated: z.number().describe("Percentage of discussion with heated/disagreeing tone (0-100)."),
  }),
});

export const executiveDetailsSchema = z.object({
  strategicImpact: z.string().describe("High-level strategic impact for business leadership and C-suite."),
  financialOrTimelineRisks: z.array(z.string()).describe("Financial, budget, or key delivery timeline risks."),
  executiveRecommendations: z.array(z.string()).describe("Strategic recommendations for executive leadership."),
});

export const developerDetailsSchema = z.object({
  codeDeliverables: z.array(z.string()).describe("Code components, features, or bug fixes to be delivered."),
  architecturalChanges: z.array(z.string()).describe("Architectural or design pattern changes discussed."),
  apiContractsAndDependencies: z
    .array(z.string())
    .describe("API contracts, endpoints, schemas, or dependency changes."),
  technicalBlockers: z
    .array(z.string())
    .describe("Engineering blockers, technical debt, or dependencies stalling work."),
});

export const technicalDetailsSchema = z.object({
  systemArchitectureChoices: z
    .array(z.string())
    .describe("Key system architecture, platform, or infrastructure choices."),
  techStackTradeoffs: z.array(z.string()).describe("Trade-offs, pros/cons evaluated between tech stack choices."),
  engineeringConstraints: z
    .array(z.string())
    .describe("Engineering constraints, performance SLAs, or security requirements."),
});

export const salesDetailsSchema = z.object({
  clientPainPoints: z.array(z.string()).describe("Client/Prospect core problems, pain points, or needs."),
  budgetAndAuthority: z.string().describe("Budget discussions, decision-maker authority, and buying process."),
  timelineExpectations: z.string().describe("Client timeline, target deployment date, or onboarding date."),
  nextSalesSteps: z.array(z.string()).describe("Next sales action steps, product demo, proposal, or follow-up call."),
});

export const meetingSummarySchema = z.object({
  purpose: z.string().describe("Concise statement describing the primary goal or purpose of the meeting."),
  discussionPoints: z
    .array(z.string())
    .describe("Key topics, themes, and important discussion points covered during the meeting."),
  majorOutcomes: z
    .array(z.string())
    .describe("Decisions made, key milestones reached, or key conclusions agreed upon."),
  importantConcerns: z.array(z.string()).describe("Risks, obstacles, unresolved issues, or critical questions raised."),
  unansweredQuestions: z
    .array(z.string())
    .describe("Questions raised during the meeting that remained unanswered or require follow-up"),
  nextSteps: z.array(z.string()).describe("Action items, assigned tasks, follow-up deadlines, and next milestones."),
  keyDecisions: z
    .array(keyDecisionSchema)
    .describe(
      "List of clear, explicit key decisions made during the meeting (e.g. Technology/Platform, Feature Approval, Timeline, Scope, Budget, Responsibility). If NO clear decisions were made, return an empty array []; DO NOT invent decisions."
    ),
  actionItems: z
    .array(actionItemSchema)
    .describe(
      "List of extracted actionable tasks with Task Description, Owner, Due Date, Priority, and Status. Handle missing information sensibly (Owner='Unassigned', DueDate='Not specified'). DO NOT invent ungrounded details."
    ),
  speakerAnalytics: z
    .array(speakerAnalyticsSchema)
    .describe("Speaker participation breakdown. Calculate talk time percentages and word counts per speaker."),
  sentimentAnalysis: sentimentAnalysisSchema.describe("Sentiment & emotional tone analysis breakdown of the meeting."),
  executiveDetails: executiveDetailsSchema
    .optional()
    .describe("Executive summary details if Executive template is selected."),
  developerDetails: developerDetailsSchema
    .optional()
    .describe("Developer task details if Developer template is selected."),
  technicalDetails: technicalDetailsSchema
    .optional()
    .describe("Technical decision details if Technical template is selected."),
  salesDetails: salesDetailsSchema
    .optional()
    .describe("Sales lead qualification details if Sales template is selected."),
});

/**
 * Sanitizes and cleans input text by stripping HTML markup, unescaping common HTML entities,
 * and normalizing whitespace to ensure plain text output.
 *
 * @param input - The raw text string containing potential HTML markup or entities.
 * @returns Plain text representation with HTML tags removed and spaces normalized.
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";

  let str = input;

  if (/<[a-z]/i.test(str)) {
    str = str.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n");
    let previousStr;
    do {
      previousStr = str;
      str = str.replace(/<[^>]+>/g, " ");
    } while (str !== previousStr);
    str = str
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&lsquo;/gi, "'")
      .replace(/&rdquo;/gi, '"')
      .replace(/&ldquo;/gi, '"')
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
  } else {
    str = str
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&lsquo;/gi, "'")
      .replace(/&rdquo;/gi, '"')
      .replace(/&ldquo;/gi, '"')
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  return str;
}

/**
 * Post-processes a structured MeetingSummary object to ensure all string fields
 * are free of HTML tags and assigned appropriate fallback default values if empty.
 *
 * @param summary - Raw MeetingSummary object returned by LLM or fallback generator.
 * @returns Cleaned MeetingSummary object with sanitized fields.
 */
export function cleanSummary(summary: MeetingSummary): MeetingSummary {
  return {
    purpose: stripHtml(summary.purpose) || "General meeting discussion and updates.",
    discussionPoints: (summary.discussionPoints || []).map(stripHtml).filter((s) => s.length > 0),
    majorOutcomes: (summary.majorOutcomes || []).map(stripHtml).filter((s) => s.length > 0),
    importantConcerns: (summary.importantConcerns || []).map(stripHtml).filter((s) => s.length > 0),
    unansweredQuestions: (summary.unansweredQuestions || []).map(stripHtml).filter((s) => s.length > 0),
    nextSteps: (summary.nextSteps || []).map(stripHtml).filter((s) => s.length > 0),
    keyDecisions: (summary.keyDecisions || [])
      .map((kd) => ({
        category: stripHtml(kd.category) || "General Decision",
        decision: stripHtml(kd.decision),
        context: kd.context ? stripHtml(kd.context) : undefined,
      }))
      .filter((kd) => kd.decision.length > 0),
    actionItems: (summary.actionItems || [])
      .map((item) => ({
        ...item,
        task: stripHtml(item.task),
        owner: stripHtml(item.owner) || "Unassigned",
        dueDate: stripHtml(item.dueDate) || "Not specified",
        priority: item.priority || "Medium",
        status: item.status || "Pending",
      }))
      .filter((item) => item.task.length > 0),
    speakerAnalytics:
      summary.speakerAnalytics && summary.speakerAnalytics.length > 0
        ? summary.speakerAnalytics
        : [
            { name: "Speaker 1", talkTimePercentage: 60, wordCount: 350 },
            { name: "Speaker 2", talkTimePercentage: 40, wordCount: 230 },
          ],
    sentimentAnalysis: summary.sentimentAnalysis || {
      overallTone: "Positive",
      score: 82,
      breakdown: { positive: 70, neutral: 20, concerned: 10, heated: 0 },
    },
    templateStyle: summary.templateStyle || "Standard",
    executiveDetails: summary.executiveDetails
      ? {
          strategicImpact: stripHtml(summary.executiveDetails.strategicImpact),
          financialOrTimelineRisks: (summary.executiveDetails.financialOrTimelineRisks || []).map(stripHtml),
          executiveRecommendations: (summary.executiveDetails.executiveRecommendations || []).map(stripHtml),
        }
      : undefined,
    developerDetails: summary.developerDetails
      ? {
          codeDeliverables: (summary.developerDetails.codeDeliverables || []).map(stripHtml),
          architecturalChanges: (summary.developerDetails.architecturalChanges || []).map(stripHtml),
          apiContractsAndDependencies: (summary.developerDetails.apiContractsAndDependencies || []).map(stripHtml),
          technicalBlockers: (summary.developerDetails.technicalBlockers || []).map(stripHtml),
        }
      : undefined,
    technicalDetails: summary.technicalDetails
      ? {
          systemArchitectureChoices: (summary.technicalDetails.systemArchitectureChoices || []).map(stripHtml),
          techStackTradeoffs: (summary.technicalDetails.techStackTradeoffs || []).map(stripHtml),
          engineeringConstraints: (summary.technicalDetails.engineeringConstraints || []).map(stripHtml),
        }
      : undefined,
    salesDetails: summary.salesDetails
      ? {
          clientPainPoints: (summary.salesDetails.clientPainPoints || []).map(stripHtml),
          budgetAndAuthority: stripHtml(summary.salesDetails.budgetAndAuthority),
          timelineExpectations: stripHtml(summary.salesDetails.timelineExpectations),
          nextSalesSteps: (summary.salesDetails.nextSalesSteps || []).map(stripHtml),
        }
      : undefined,
  };
}

/**
 * Heuristic fallback generator used when no AI API key is configured or when AI provider calls fail.
 * Extracts key sentences, decision keywords, and simple action items directly from transcript text lines.
 *
 * @param rawTranscript - Raw transcript string.
 * @param title - Optional meeting title.
 * @returns A structured MeetingSummary generated via text heuristic extraction.
 */
export function generateFallbackSummary(rawTranscript: string, title?: string): MeetingSummary {
  const plainTranscript = stripHtml(rawTranscript);

  const lines = plainTranscript
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("<"));

  const cleanText = plainTranscript.trim();

  if (!cleanText) {
    return cleanSummary({
      purpose: title ? `Discuss ${title}` : "General team sync and progress review.",
      discussionPoints: ["Initial overview of project status and updates."],
      majorOutcomes: ["Aligned on current project direction."],
      importantConcerns: ["Ensure timeline deadlines are maintained."],
      unansweredQuestions: [],
      nextSteps: ["Schedule follow-up sync for next status update."],
      keyDecisions: [],
      actionItems: [],
    });
  }

  // Extract key sentences or lines for points
  const points = lines.slice(0, 8);

  // Extract questions or unanswered items from transcript lines
  const extractedQuestions = lines
    .filter(
      (l) =>
        l.endsWith("?") ||
        l.toLowerCase().includes("unresolved") ||
        l.toLowerCase().includes("tbd") ||
        l.toLowerCase().includes("open question")
    )
    .slice(0, 3);

  const extractedDecisions: KeyDecision[] = [];
  const lowerText = cleanText.toLowerCase();

  if (
    lowerText.includes("agreed") ||
    lowerText.includes("decided") ||
    lowerText.includes("outcome") ||
    lowerText.includes("approved")
  ) {
    const decisionLine = lines.find((l) => {
      const low = l.toLowerCase();
      return low.includes("agreed") || low.includes("decided") || low.includes("approved") || low.includes("outcome");
    });

    if (decisionLine) {
      extractedDecisions.push({
        category: lowerText.includes("timeline")
          ? "Timeline Agreed"
          : lowerText.includes("tech") || lowerText.includes("stack") || lowerText.includes("api")
            ? "Technology/Platform"
            : "General Decision",
        decision: decisionLine,
        context: "Extracted from meeting transcript records.",
      });
    }
  }

  // Extract Action Items from transcript lines
  const extractedActionItems: ActionItem[] = points.slice(0, 3).map((p) => {
    let owner = "Unassigned";

    // Simple heuristic name detection
    if (p.toLowerCase().includes("sarah")) owner = "Sarah";
    else if (p.toLowerCase().includes("alex")) owner = "Alex";
    else if (p.toLowerCase().includes("john")) owner = "John";
    else if (p.includes("@")) {
      const match = p.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (match) owner = match[0].split("@")[0];
    }

    return {
      task: p,
      owner,
      dueDate: "Not specified",
      priority: "Medium" as const,
      status: "Pending" as const,
    };
  });

  return cleanSummary({
    purpose: title
      ? `Meeting regarding ${title}: ${points[0] || cleanText.slice(0, 100)}`
      : `Review and discussion covering key updates: ${points[0] || cleanText.slice(0, 100)}`,
    discussionPoints:
      points.length > 0
        ? points.slice(0, 4)
        : ["Discussed project workflow, current progress, and operational updates."],
    majorOutcomes:
      points.length > 2
        ? [points[1] || "Agreed on project approach and key action points."]
        : ["Reviewed status and validated current action items."],
    importantConcerns:
      points.length > 4
        ? [points[3] || "Monitor progress and address pending dependencies promptly."]
        : ["Keep team aligned on project dependencies and deadlines."],
    unansweredQuestions: extractedQuestions,
    nextSteps:
      points.length > 5
        ? points.slice(4, 7)
        : ["Complete assigned action items discussed in transcript.", "Share updated documentation with team members."],
    keyDecisions: extractedDecisions,
    actionItems: extractedActionItems,
    speakerAnalytics: (() => {
      const speakerCounts = new Map<string, number>();
      let totalWords = 0;

      lines.forEach((line) => {
        const match = line.match(/^([a-zA-Z0-9\s_]+):/);
        const name = match ? match[1].trim() : "Participant";
        const words = line.split(/\s+/).length;
        if (name !== "__proto__" && name !== "constructor" && name !== "prototype") {
          speakerCounts.set(name, (speakerCounts.get(name) || 0) + words);
        }
        totalWords += words;
      });

      if (totalWords === 0 || speakerCounts.size === 0) {
        return [
          { name: "Speaker 1", talkTimePercentage: 60, wordCount: 350 },
          { name: "Speaker 2", talkTimePercentage: 40, wordCount: 230 },
        ];
      }

      return Array.from(speakerCounts.entries()).map(([name, count]) => ({
        name,
        wordCount: count,
        talkTimePercentage: Math.round((count / totalWords) * 100),
      }));
    })(),
    sentimentAnalysis: (() => {
      const text = cleanText.toLowerCase();
      let posCount = (
        text.match(/\b(good|great|agreed|approved|thanks|happy|excellent|successful|awesome|progress)\b/g) || []
      ).length;
      let conCount = (text.match(/\b(risk|issue|delay|problem|concern|blocked|stuck|difficult|worry|hard)\b/g) || [])
        .length;
      let heatCount = (text.match(/\b(no|disagree|wrong|fail|failed|reject|refuse|argument)\b/g) || []).length;
      let totalHits = posCount + conCount + heatCount;

      if (totalHits === 0) {
        return {
          overallTone: "Positive" as const,
          score: 80,
          breakdown: { positive: 70, neutral: 20, concerned: 10, heated: 0 },
        };
      }

      let positivePct = Math.round((posCount / (totalHits + 2)) * 100);
      let concernedPct = Math.round((conCount / (totalHits + 2)) * 100);
      let heatedPct = Math.round((heatCount / (totalHits + 2)) * 100);
      let neutralPct = Math.max(0, 100 - (positivePct + concernedPct + heatedPct));

      let overallTone: "Positive" | "Neutral" | "Concerned" | "Heated" = "Neutral";
      let score = 70;

      if (heatedPct > 25) {
        overallTone = "Heated";
        score = 40;
      } else if (concernedPct > 30) {
        overallTone = "Concerned";
        score = 55;
      } else if (positivePct >= neutralPct) {
        overallTone = "Positive";
        score = 85;
      }

      return {
        overallTone,
        score,
        breakdown: {
          positive: positivePct,
          neutral: neutralPct,
          concerned: concernedPct,
          heated: heatedPct,
        },
      };
    })(),
  });
}

/**
 * Primary meeting summarization function using AI LLMs (Vercel AI SDK).
 * Priority execution order:
 * 1. Primary Google Gemini Key (customApiKey or GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY)
 * 2. Rotating Keys Policy (GEMINI_API_KEYS)
 * 3. Fallback Model Key (GEMINI_FALL_BACK_KEY in error catch block)
 * 4. Last Resort Heuristic Summary Generator
 *
 * @param rawTranscript - Raw transcript string.
 * @param customApiKey - Optional custom API key provided by user.
 * @param title - Optional title of the meeting.
 * @returns Promise resolving to a structured, sanitized MeetingSummary object.
 */
export async function generateMeetingSummary(
  rawTranscript: string,
  customApiKey?: string,
  title?: string,
  language?: string,
  summaryLength: SummaryLength = "Medium",
  template: SummaryTemplate = "Standard",
  customPrompt?: string
): Promise<MeetingSummary> {
  const primaryGoogleKey = customApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const geminiFallBackKey = process.env.GEMINI_FALL_BACK_KEY;
  const plainTranscript = stripHtml(rawTranscript);

  if (!plainTranscript || plainTranscript.trim().length === 0) {
    return generateFallbackSummary("", title);
  }

  const promptText = buildMeetingSummaryPrompt({
    plainTranscript,
    title,
    language,
    summaryLength,
    template,
    customPrompt,
  });

  try {
    // ========================================================
    // 1. TRY PRIMARY GOOGLE KEY FIRST
    // ========================================================
    if (primaryGoogleKey) {
      try {
        console.log("Attempting meeting summarization with Primary Google Key...");
        const { object } = await generateObject({
          model: google("gemini-3.5-flash-lite"),
          schema: meetingSummarySchema,
          prompt: promptText,
        });
        return cleanSummary({ ...object, templateStyle: template });
      } catch (primaryError: any) {
        console.warn("Primary Google Key failed. Proceeding to Key Rotation policy...");
      }
    }

    // ========================================================
    // 2. TRY ROTATING KEYS POLICY (RPI: GEMINI_API_KEYS)
    // ========================================================
    const rotationKeys = getRotationPolicyApiKeys().filter((k) => k !== primaryGoogleKey);

    if (rotationKeys.length > 0) {
      console.log(`[Step 2] Attempting Key Rotation Policy across ${rotationKeys.length} key(s)...`);

      for (let i = 0; i < rotationKeys.length; i++) {
        const apiKey = rotationKeys[i];

        try {
          console.log(`Rotating Key #${i + 1}...`);
          const google = createGoogleGenerativeAI({ apiKey });
          const { object } = await generateObject({
            model: google("gemini-3.5-flash-lite"),
            schema: meetingSummarySchema,
            prompt: promptText,
          });
          return cleanSummary(object);
        } catch (rotError: any) {
          console.warn(` Rotating Key #${i + 1} failed.`);
        }
      }
    }

    // If both Primary and Rotation Keys failed/exhausted, throw error to trigger Fallback catch block
    throw new Error("All Primary and Rotating Gemini API keys failed or were exhausted.");
  } catch (error: any) {
    // ========================================================
    // 3. FALLBACK PLAN (GEMINI_FALL_BACK_KEY in Error Catch Block)
    // ========================================================
    if (geminiFallBackKey) {
      try {
        console.log("[Step 3] Primary & Rotating keys failed. Attempting Fallback Model Key (GEMINI_FALL_BACK_KEY)...");
        const google = createGoogleGenerativeAI({ apiKey: geminiFallBackKey });
        const { object } = await generateObject({
          model: google("gemini-3.5-flash-lite"),
          schema: meetingSummarySchema,
          prompt: promptText,
        });

        return cleanSummary(object);
      } catch (fallbackError: any) {
        console.error("Fallback Model Key (GEMINI_FALL_BACK_KEY) failed.");
      }
    } else {
      console.warn("No Fallback Model Key configured (GEMINI_FALL_BACK_KEY missing).");
    }
  }

  // ========================================================
  // 4. LAST RESORT: HEURISTIC GENERATOR
  // ========================================================
  console.warn(
    "🚨 [Step 4] Primary Google Key, Key Rotation pool, and Fallback Key all failed. Using structured heuristic fallback."
  );
  return generateFallbackSummary(plainTranscript, title);
}

import { appendDebugLog } from "../utils/appendLog";

/**
 * Splits transcript into paragraph chunks, generates embeddings using OpenAI, and saves them to the vector database
 */
export async function processAndSaveTranscriptEmbeddings(meetingId: string, transcript: string): Promise<void> {
  const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  appendDebugLog(`--- Starting Embedding Process for Meeting ID: ${meetingId} ---`);

  if (!googleApiKey || !transcript || transcript.trim().length === 0) {
    appendDebugLog(`Skipped: Missing API key or empty transcript. API Key Present: ${!!googleApiKey}`);
    return;
  }

  try {
    const plainText = stripHtml(transcript);
    // Split by paragraphs
    const paragraphs = plainText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    appendDebugLog(`Found ${paragraphs.length} paragraphs matching length criteria (> 20 chars).`);

    if (paragraphs.length === 0) {
      appendDebugLog("Skipped: No valid paragraph chunks found.");
      return;
    }

    appendDebugLog("Sending paragraphs to Gemini Embedding API...");
    const dynamicGoogle = createGoogleGenerativeAI({ apiKey: googleApiKey });
    const { embeddings } = await embedMany({
      model: dynamicGoogle.embedding("gemini-embedding-001"),
      values: paragraphs,
      providerOptions: {
        google: {
          outputDimensionality: 1536,
        },
      },
    });

    appendDebugLog(`Gemini generated ${embeddings.length} embeddings successfully.`);

    // Delete existing chunks first to prevent duplicates on update
    await db.delete(meetingChunks).where(eq(meetingChunks.meetingId, meetingId));
    appendDebugLog(`Cleaned old chunks for meeting: ${meetingId}`);

    const chunkRows = paragraphs.map((content, index) => ({
      id: `${meetingId}-chunk-${Date.now()}-${index}`,
      meetingId,
      content,
      embedding: embeddings[index],
      createdAt: new Date(),
    }));

    await db.insert(meetingChunks).values(chunkRows);
    appendDebugLog(`Successfully inserted ${chunkRows.length} chunks into Neon pgvector DB.`);
  } catch (err: any) {
    appendDebugLog(`ERROR during generation/saving: ${sanitizeError(err)}`);
    console.error("Failed to generate and save transcript chunks to pgvector:", sanitizeError(err));
  }
}

/**
 * RAG query engine to answer questions based on the meeting transcript
 * Uses pgvector cosine similarity matching if database is populated, otherwise falls back to text search heuristics
 */
export async function queryMeetingRAG(
  question: string,
  transcript: string,
  history: { role: string; content: string }[] = [],
  customApiKey?: string,
  meetingId?: string
): Promise<{ answer: string; retrievedSources: string[] }> {
  const primaryGoogleKey = customApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const geminiFallBackKey = process.env.GEMINI_FALL_BACK_KEY;
  const plainTranscript = stripHtml(transcript);

  let retrievedSources: string[] = [];

  // 1. Try vector database embedding retrieval first if meetingId is provided
  if (meetingId) {
    try {
      const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (googleApiKey) {
        appendDebugLog(`RAG similarity query searching vector chunks for meeting: ${meetingId}`);
        // Generate embedding vector for the question query
        const dynamicGoogle = createGoogleGenerativeAI({ apiKey: googleApiKey });
        const { embedding } = await embed({
          model: dynamicGoogle.embedding("gemini-embedding-001"),
          value: question,
          providerOptions: {
            google: {
              outputDimensionality: 1536,
            },
          },
        });

        // Similarity search query using cosine distance (<=> operator in pgvector)
        const similarityThreshold = 0.75;
        const matchingChunks = await db
          .select({
            content: meetingChunks.content,
            similarity: sql<number>`1 - (${meetingChunks.embedding} <=> ${JSON.stringify(embedding)}::vector)`,
          })
          .from(meetingChunks)
          .where(sql`${meetingChunks.meetingId} = ${meetingId}`)
          .orderBy(sql`${meetingChunks.embedding} <=> ${JSON.stringify(embedding)}::vector`)
          .limit(5);

        const filtered = matchingChunks.filter((c) => c.similarity >= similarityThreshold);
        if (filtered.length > 0) {
          retrievedSources = filtered.map((f) => f.content);
        }
      }
    } catch (vecErr) {
      console.warn("Vector search failed, falling back to text heuristics:", sanitizeError(vecErr));
    }
  }

  // 2. Fall back to text chunk parsing if pgvector is empty or not configured
  if (retrievedSources.length === 0) {
    const lines = plainTranscript
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const qKeywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    let matchingLines = lines.filter((line) => qKeywords.some((keyword) => line.toLowerCase().includes(keyword)));

    if (matchingLines.length === 0) {
      retrievedSources = lines.slice(0, 30);
    } else {
      retrievedSources = matchingLines.slice(0, 25);
    }
  }

  const contextText = retrievedSources.join("\n");
  const chatHistoryStr = history.map((h) => `${h.role === "user" ? "Question" : "Answer"}: ${h.content}`).join("\n");

  const { buildRAGPrompt } = await import("../utils/aiPrompts");
  const prompt = buildRAGPrompt({ contextText, chatHistoryStr, question });

  // Try API keys in order
  const apiKeys = [
    primaryGoogleKey,
    ...getRotationPolicyApiKeys().filter((k) => k !== primaryGoogleKey),
    geminiFallBackKey,
  ].filter(Boolean) as string[];

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { object } = await generateObject({
        model: google("gemini-3.5-flash-lite"),
        schema: z.object({ answer: z.string() }),
        prompt,
      });
      return {
        answer: object.answer || "I could not find information regarding that in this meeting.",
        retrievedSources,
      };
    } catch (err: any) {
      console.warn(`RAG Key attempt #${i + 1} failed.`);
    }
  }

  return {
    answer: `[Heuristic Fallback] Based on transcript: ${retrievedSources.slice(0, 3).join("; ")}`,
    retrievedSources,
  };
}

// ============================================================
// Cross-Meeting Intelligence Types & Schema
// ============================================================

export interface CrossMeetingIntelligence {
  recurringThemes: string[];
  unresolvedBlockers: { issue: string; firstSeenOccurrence: number }[];
  actionItemCarryOver: { task: string; owner: string; openSinceOccurrence: number }[];
  sentimentTrend: { occurrence: number; title: string; score: number; tone: string }[];
  participantConsistency: { email: string; attendedCount: number; totalOccurrences: number }[];
  keyInsights: string[];
  recommendedFocusAreas: string[];
}

const crossMeetingIntelligenceSchema = z.object({
  recurringThemes: z
    .array(z.string())
    .describe("List of themes, topics, or discussion areas that appear across multiple meetings in this series."),
  unresolvedBlockers: z
    .array(
      z.object({
        issue: z.string().describe("Description of the unresolved blocker or risk."),
        firstSeenOccurrence: z.number().describe("Occurrence number (1-indexed) where this blocker first appeared."),
      })
    )
    .describe("Issues, blockers, or risks raised in earlier meetings that remain unresolved."),
  actionItemCarryOver: z
    .array(
      z.object({
        task: z.string().describe("Description of the action item that was not completed."),
        owner: z.string().describe("Person responsible. 'Unassigned' if unknown."),
        openSinceOccurrence: z
          .number()
          .describe("Occurrence number (1-indexed) where this action item was first assigned."),
      })
    )
    .describe("Action items assigned in earlier meetings that appear to still be open."),
  sentimentTrend: z
    .array(
      z.object({
        occurrence: z.number().describe("Occurrence number (1-indexed) of the meeting."),
        title: z.string().describe("Short title of the meeting."),
        score: z.number().describe("Sentiment score 0-100 (0=very negative, 100=very positive)."),
        tone: z.string().describe("Overall tone: Positive, Neutral, Concerned, or Heated."),
      })
    )
    .describe("Sentiment score and tone for each meeting occurrence in the series."),
  participantConsistency: z
    .array(
      z.object({
        email: z.string().describe("Participant email or name."),
        attendedCount: z.number().describe("Number of meetings in the series this participant attended."),
        totalOccurrences: z.number().describe("Total number of meetings analyzed in the series."),
      })
    )
    .describe("Attendance consistency of each participant across the series."),
  keyInsights: z
    .array(z.string())
    .describe("High-level AI-generated bullet points summarizing what has been happening across this series."),
  recommendedFocusAreas: z
    .array(z.string())
    .describe("What the next meeting in this series should focus on based on unresolved issues and trends."),
});

/**
 * Generates cross-meeting intelligence by analyzing all meetings in a series together.
 * Sends all transcripts and summaries to Gemini in a single structured call.
 *
 * @param meetings - Array of meeting records from the series (ordered by occurrence)
 * @returns Structured CrossMeetingIntelligence object
 */
export async function generateCrossMeetingIntelligence(
  meetings: Array<{
    id: string;
    title: string;
    date: string;
    seriesOccurrence?: number | null;
    participants: string[];
    transcript?: string | null;
    summary?: any | null;
  }>
): Promise<CrossMeetingIntelligence> {
  const totalOccurrences = meetings.length;

  // Build a condensed description of each meeting for the prompt
  const meetingDescriptions = meetings
    .map((m, idx) => {
      const occurrence = m.seriesOccurrence ?? idx + 1;
      const summaryText = m.summary
        ? [
            `Purpose: ${m.summary.purpose || ""}`,
            m.summary.discussionPoints?.length
              ? `Topics: ${m.summary.discussionPoints.slice(0, 3).join("; ")}`
              : "",
            m.summary.importantConcerns?.length
              ? `Concerns: ${m.summary.importantConcerns.slice(0, 2).join("; ")}`
              : "",
            m.summary.actionItems?.length
              ? `Action Items: ${m.summary.actionItems
                  .slice(0, 4)
                  .map((a: any) => `${a.task} (${a.owner}, ${a.status})`)
                  .join("; ")}`
              : "",
            m.summary.sentimentAnalysis
              ? `Sentiment: ${m.summary.sentimentAnalysis.overallTone} (score: ${m.summary.sentimentAnalysis.score})`
              : "",
          ]
            .filter(Boolean)
            .join("\n  ")
        : m.transcript
          ? `Transcript excerpt: ${stripHtml(m.transcript).slice(0, 500)}`
          : "No summary or transcript available.";

      return `=== MEETING #${occurrence} (${m.date}) — "${m.title}" ===
Participants: ${m.participants.join(", ")}
${summaryText}`;
    })
    .join("\n\n");

  const prompt = `You are an expert meeting intelligence analyst. You are analyzing a series of ${totalOccurrences} related recurring meetings.

Your task is to identify patterns, carry-over issues, sentiment trends, and cross-meeting insights.

Here are all the meetings in chronological order:

${meetingDescriptions}

Based on the above meetings, provide a structured cross-meeting intelligence report. Be specific and concrete. 
- For sentimentTrend, provide one entry per meeting occurrence using the occurrence number and inferred or given sentiment score.
- For participantConsistency, track each unique participant email/name and how many meetings they attended.
- For recurringThemes, list specific topics that appeared in 2+ meetings.
- For unresolvedBlockers, identify risks or concerns from early meetings that were not resolved later.
- For actionItemCarryOver, identify action items assigned in earlier meetings that still appear open in later ones.
- Keep keyInsights to 3-5 high-value bullet points.
- Keep recommendedFocusAreas to 2-4 concrete action items for the next meeting.`;

  const primaryGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const fallbackKey = process.env.GEMINI_FALL_BACK_KEY;
  const rotationKeys = getRotationPolicyApiKeys();

  // Build fallback result from available data
  const buildHeuristicIntelligence = (): CrossMeetingIntelligence => {
    const allParticipants = new Map<string, number>();
    meetings.forEach((m) => {
      m.participants.forEach((p) => allParticipants.set(p, (allParticipants.get(p) || 0) + 1));
    });

    return {
      recurringThemes: ["Unable to analyze — no AI key configured or AI service failed"],
      unresolvedBlockers: [],
      actionItemCarryOver: [],
      sentimentTrend: meetings.map((m, idx) => ({
        occurrence: m.seriesOccurrence ?? idx + 1,
        title: m.title,
        score: m.summary?.sentimentAnalysis?.score ?? 70,
        tone: m.summary?.sentimentAnalysis?.overallTone ?? "Neutral",
      })),
      participantConsistency: Array.from(allParticipants.entries()).map(([email, count]) => ({
        email,
        attendedCount: count,
        totalOccurrences,
      })),
      keyInsights: ["AI analysis could not be generated. Please configure a Gemini API key."],
      recommendedFocusAreas: ["Review outstanding action items from previous meetings."],
    };
  };

  try {
    if (primaryGoogleKey) {
      try {
        const { object } = await generateObject({
          model: google("gemini-3.5-flash-lite"),
          schema: crossMeetingIntelligenceSchema,
          prompt,
        });
        return object as CrossMeetingIntelligence;
      } catch (e) {
        console.warn("[CrossMeetingIntelligence] Primary key failed, trying rotation...");
      }
    }

    for (const apiKey of rotationKeys.filter((k) => k !== primaryGoogleKey)) {
      try {
        const googleClient = createGoogleGenerativeAI({ apiKey });
        const { object } = await generateObject({
          model: googleClient("gemini-3.5-flash-lite"),
          schema: crossMeetingIntelligenceSchema,
          prompt,
        });
        return object as CrossMeetingIntelligence;
      } catch (e) {
        console.warn("[CrossMeetingIntelligence] Rotation key failed...");
      }
    }

    if (fallbackKey) {
      try {
        const googleClient = createGoogleGenerativeAI({ apiKey: fallbackKey });
        const { object } = await generateObject({
          model: googleClient("gemini-3.5-flash-lite"),
          schema: crossMeetingIntelligenceSchema,
          prompt,
        });
        return object as CrossMeetingIntelligence;
      } catch (e) {
        console.warn("[CrossMeetingIntelligence] Fallback key failed.");
      }
    }

    return buildHeuristicIntelligence();
  } catch (error) {
    console.error("[CrossMeetingIntelligence] Unexpected error:", error);
    return buildHeuristicIntelligence();
  }
}

