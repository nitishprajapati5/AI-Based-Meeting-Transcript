"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ActionItem, SubTask } from "@/types/meeting";
import { ActionItemWithContext } from "./types";
import { getPriorityBadgeClass } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  CalendarCheck,
  Users,
  Archive,
  User,
  Clock,
  Edit,
  Trash2,
  CheckSquare,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { EmptyActionItemsIllustration } from "@/components/ui/illustrations";

interface ActionItemsMatrixProps {
  isLoading: boolean;
  displayItems: ActionItemWithContext[];
  allItems: ActionItemWithContext[];
  updatingItemId: string | null;
  onStatusChange: (id: string, newStatus: ActionItem["status"]) => void;
  onToggleSubtask?: (itemId: string, subtaskId: string, completed: boolean) => void;
  onEdit: (item: ActionItemWithContext) => void;
  onDelete: (item: ActionItemWithContext) => void;
}

interface QuadrantConfig {
  id: "q1" | "q2" | "q3" | "q4";
  title: string;
  actionWord: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  containerClass: string;
  badgeClass: string;
  headerColor: string;
}

export function ActionItemsMatrix({
  isLoading,
  displayItems,
  allItems,
  updatingItemId,
  onStatusChange,
  onToggleSubtask,
  onEdit,
  onDelete,
}: ActionItemsMatrixProps) {
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklist = (id: string) => {
    setExpandedChecklists((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getDependencyStatus = (item: ActionItemWithContext) => {
    if (!item.dependsOn || item.dependsOn.length === 0) return null;
    const prereqs = allItems.filter((i) => item.dependsOn?.includes(i.id));
    const incomplete = prereqs.filter((p) => p.status !== "Completed");
    return {
      total: prereqs.length,
      incomplete,
      isBlocked: incomplete.length > 0,
    };
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Helper to determine if a task is "Urgent" (due within 3 days or overdue)
  const isTaskUrgent = (item: ActionItemWithContext) => {
    if (item.isOverdue) return true;
    const d = new Date(item.dueDate);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  // Helper to determine if a task is "Important" (High or Urgent priority)
  const isTaskImportant = (item: ActionItemWithContext) => {
    return item.priority === "High" || item.priority === "Urgent";
  };

  const quadrants: Record<"q1" | "q2" | "q3" | "q4", ActionItemWithContext[]> = {
    q1: [],
    q2: [],
    q3: [],
    q4: [],
  };

  displayItems.forEach((item) => {
    const urgent = isTaskUrgent(item);
    const important = isTaskImportant(item);

    if (urgent && important) {
      quadrants.q1.push(item);
    } else if (!urgent && important) {
      quadrants.q2.push(item);
    } else if (urgent && !important) {
      quadrants.q3.push(item);
    } else {
      quadrants.q4.push(item);
    }
  });

  const quadrantConfigs: QuadrantConfig[] = [
    {
      id: "q1",
      title: "Do First (Urgent & Important)",
      actionWord: "CRITICAL & IMMINENT",
      description: "Immediate high-impact deadlines that require prompt execution.",
      icon: Flame,
      containerClass: "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      headerColor: "text-rose-600 dark:text-rose-400",
    },
    {
      id: "q2",
      title: "Schedule (Important, Not Urgent)",
      actionWord: "STRATEGIC GOALS",
      description: "High-value milestone tasks to plan and dedicate deep focus time to.",
      icon: CalendarCheck,
      containerClass: "border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/10",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      headerColor: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "q3",
      title: "Delegate (Urgent, Not Important)",
      actionWord: "QUICK WINS & DELEGATE",
      description: "Time-sensitive operational items that can be shared or quickly resolved.",
      icon: Users,
      containerClass: "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      headerColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "q4",
      title: "Backlog / Don't Do (Low Impact)",
      actionWord: "ELIMINATE & POSTPONE",
      description: "Low-priority backlog requests that can be postponed or reconsidered.",
      icon: Archive,
      containerClass: "border-border bg-muted/20",
      badgeClass: "bg-muted text-muted-foreground border-border",
      headerColor: "text-muted-foreground",
    },
  ];

  if (!isLoading && displayItems.length === 0) {
    return (
      <div className="p-12 text-center paper-card rounded-2xl border border-border text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <EmptyActionItemsIllustration className="w-24 h-24 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-bold text-foreground">No matrix records found.</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {quadrantConfigs.map((quad) => {
        const QuadIcon = quad.icon;
        const items = quadrants[quad.id];

        return (
          <div
            key={quad.id}
            className={`flex flex-col rounded-2xl border p-4 sm:p-5 min-h-[380px] shadow-xs ${quad.containerClass}`}
          >
            {/* Quadrant Header */}
            <div className="flex items-start justify-between pb-3 mb-3 border-b border-border/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <QuadIcon className={`h-4.5 w-4.5 ${quad.headerColor}`} />
                  <h3 className="text-sm font-bold text-foreground">{quad.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">{quad.description}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] font-semibold rounded-md shrink-0 ${quad.badgeClass}`}>
                {items.length} {items.length === 1 ? "task" : "tasks"}
              </Badge>
            </div>

            {/* Quadrant Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="h-36 border-1.5 border-dashed border-border/80 rounded-xl flex items-center justify-center text-xs text-muted-foreground/70 font-medium">
                  No tasks in this quadrant
                </div>
              ) : (
                items.map((item) => {
                  const depStatus = getDependencyStatus(item);
                  const subtasks = item.subtasks || [];
                  const completedSubtasks = subtasks.filter((s) => s.completed).length;
                  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
                  const isChecklistOpen = expandedChecklists[item.id];

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3.5 rounded-xl border paper-sheet shadow-xs hover:shadow-md transition-all space-y-2.5 ${
                        item.status === "Completed"
                          ? "opacity-75 bg-muted/20"
                          : depStatus?.isBlocked
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border"
                      }`}
                    >
                      {/* Card Top: Title & Controls */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p
                            className={`text-xs sm:text-sm font-semibold text-foreground ${
                              item.status === "Completed" ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.task}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-semibold px-1.5 py-0 rounded-md border ${getPriorityBadgeClass(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                              {item.meetingTitle}
                            </span>
                          </div>
                        </div>

                        {/* Status Select */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Select
                            value={item.status}
                            onValueChange={(val) => onStatusChange(item.id, val as ActionItem["status"])}
                            disabled={updatingItemId === item.id}
                          >
                            <SelectTrigger className="h-6.5 text-[11px] w-24 bg-card border-border rounded-md px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Blocked">Blocked</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Dependency Blocked Banner */}
                      {depStatus?.isBlocked && (
                        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300">
                          <Link2 className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>
                            <strong>Blocked by:</strong> {depStatus.incomplete.map((p) => p.task).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Subtasks Progress */}
                      {subtasks.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-border/40">
                          <div className="flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => toggleChecklist(item.id)}
                              className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                              <CheckSquare className="h-3 w-3 text-indigo-500" />
                              <span>Subtasks ({completedSubtasks}/{subtasks.length})</span>
                              {isChecklistOpen ? (
                                <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                              )}
                            </button>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {Math.round(subtaskProgress)}%
                            </span>
                          </div>
                          <Progress value={subtaskProgress} className="h-1" />

                          {/* Expandable Subtask Checklist */}
                          <AnimatePresence>
                            {isChecklistOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1 pt-1.5 pl-1.5"
                              >
                                {subtasks.map((st) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 text-[11px] text-foreground hover:bg-muted/40 p-1 rounded-md cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={(e) => onToggleSubtask?.(item.id, st.id, e.target.checked)}
                                      className="rounded border-border text-primary focus:ring-ring h-3 w-3"
                                    />
                                    <span className={st.completed ? "line-through text-muted-foreground" : ""}>
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {item.owner}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.dueDate}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
