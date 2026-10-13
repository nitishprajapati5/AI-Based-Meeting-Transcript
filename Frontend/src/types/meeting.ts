export type SummaryLength = "Short" | "Medium" | "Long";
export type SummaryTemplate = "Standard" | "Executive" | "Developer" | "Technical" | "Sales";

export type MeetingType =
  | "Client Meeting"
  | "Sales Meeting"
  | "Project Meeting"
  | "Internal Meeting"
  | "Requirement Discussion"
  | "Retrospective"
  | "Other";

export interface KeyDecision {
  category: string;
  decision: string;
  context?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ActionItem {
  id?: string;
  meetingId?: string;
  task: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Blocked" | "Completed" | "Pending";
  subtasks?: SubTask[];
  dependsOn?: string[];
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

export interface Meeting {
  id: string;
  title: string;
  date: string;
  type: MeetingType;
  participants: string[];
  transcript: string;
  summary?: MeetingSummary | null;
  createdAt: string;
  updatedAt: string;
  isMeetingPublished?: boolean;
  shareExpiresAt?: string | null;
  hasPassword?: boolean;
  hasChunks: boolean;
  isPinned: boolean;
}
