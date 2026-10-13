import { ActionItem, SubTask } from "@/types/meeting";

export type ActionTrackerViewMode = "table" | "kanban" | "timeline" | "matrix";

export interface ActionItemWithContext extends ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  isOverdue: boolean;
  subtasks?: SubTask[];
  dependsOn?: string[];
}

export interface ActionItemMetrics {
  total: number;
  inProgress: number;
  blocked: number;
  overdue: number;
}
