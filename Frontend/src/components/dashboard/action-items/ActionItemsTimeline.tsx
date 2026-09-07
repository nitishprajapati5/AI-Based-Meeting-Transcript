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
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Edit,
  Trash2,
  CheckSquare,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { EmptyActionItemsIllustration } from "@/components/ui/illustrations";

interface ActionItemsTimelineProps {
  isLoading: boolean;
  displayItems: ActionItemWithContext[];
  allItems: ActionItemWithContext[];
  updatingItemId: string | null;
  onStatusChange: (id: string, newStatus: ActionItem["status"]) => void;
  onToggleSubtask?: (itemId: string, subtaskId: string, completed: boolean) => void;
  onEdit: (item: ActionItemWithContext) => void;
  onDelete: (item: ActionItemWithContext) => void;
}

interface TimelineBucket {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  headerColor: string;
  badgeColor: string;
  items: ActionItemWithContext[];
}

export function ActionItemsTimeline({
  isLoading,
  displayItems,
  allItems,
  updatingItemId,
  onStatusChange,
  onToggleSubtask,
  onEdit,
  onDelete,
}: ActionItemsTimelineProps) {
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklist = (id: string) => {
    setExpandedChecklists((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to check if task dependencies are completed
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

  // Group items into Timeline Horizons
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const buckets: TimelineBucket[] = [
    {
      id: "overdue",
      label: "Overdue & Urgent",
      subtitle: "Missed target deadlines requiring immediate attention",
      icon: AlertTriangle,
      headerColor: "text-rose-600 dark:text-rose-400",
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      items: [],
    },
    {
      id: "today",
      label: "Due Today",
      subtitle: "Action items with targets due before end of day",
      icon: Clock,
      headerColor: "text-amber-600 dark:text-amber-400",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      items: [],
    },
    {
      id: "thisWeek",
      label: "This Week",
      subtitle: "Scheduled within the next 7 days",
      icon: Calendar,
      headerColor: "text-blue-600 dark:text-blue-400",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      items: [],
    },
    {
      id: "nextWeek",
      label: "Next Week",
      subtitle: "Upcoming sprint items (7-14 days out)",
      icon: Calendar,
      headerColor: "text-indigo-600 dark:text-indigo-400",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      items: [],
    },
    {
      id: "later",
      label: "Later & Backlog",
      subtitle: "Longer horizon tasks or unscheduled targets",
      icon: CheckCircle2,
      headerColor: "text-muted-foreground",
      badgeColor: "bg-muted text-muted-foreground border-border",
      items: [],
    },
  ];

  displayItems.forEach((item) => {
    if (item.status === "Completed") {
      buckets[4].items.push(item);
      return;
    }
    if (item.isOverdue) {
      buckets[0].items.push(item);
      return;
    }

    const itemDate = new Date(item.dueDate);
    if (isNaN(itemDate.getTime())) {
      buckets[4].items.push(item);
      return;
    }

    itemDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      buckets[1].items.push(item);
    } else if (diffDays > 0 && diffDays <= 7) {
      buckets[2].items.push(item);
    } else if (diffDays > 7 && diffDays <= 14) {
      buckets[3].items.push(item);
    } else {
      buckets[4].items.push(item);
    }
  });

  const activeBuckets = buckets.filter((b) => b.items.length > 0);

  if (!isLoading && displayItems.length === 0) {
    return (
      <div className="p-12 text-center paper-card rounded-2xl border border-border text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <EmptyActionItemsIllustration className="w-24 h-24 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-bold text-foreground">No timeline records found.</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeBuckets.map((bucket) => {
        const BucketIcon = bucket.icon;
        return (
          <section key={bucket.id} className="space-y-3.5">
            {/* Horizon Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border border-border bg-card ${bucket.headerColor}`}>
                  <BucketIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {bucket.label}
                    <Badge variant="outline" className={`text-[10px] font-semibold rounded-md ${bucket.badgeColor}`}>
                      {bucket.items.length} {bucket.items.length === 1 ? "task" : "tasks"}
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{bucket.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Timeline Items Track */}
            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
              {bucket.items.map((item, idx) => {
                const depStatus = getDependencyStatus(item);
                const subtasks = item.subtasks || [];
                const completedSubtasks = subtasks.filter((s) => s.completed).length;
                const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
                const isChecklistOpen = expandedChecklists[item.id];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="relative"
                  >
                    {/* Node Dot */}
                    <div className="absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-card bg-primary ring-2 ring-border shrink-0" />

                    {/* Timeline Item Card */}
                    <div
                      className={`p-4 rounded-xl border paper-sheet shadow-xs hover:shadow-md transition-all space-y-3 ${
                        item.status === "Completed"
                          ? "opacity-75 bg-muted/20"
                          : depStatus?.isBlocked
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border"
                      }`}
                    >
                      {/* Top Row: Task Title + Meeting + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-semibold text-foreground ${
                                item.status === "Completed" ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.task}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold rounded-md border ${getPriorityBadgeClass(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                            From: <span className="font-medium text-foreground">{item.meetingTitle}</span>
                          </p>
                        </div>

                        {/* Controls & Status */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={item.status}
                            onValueChange={(val) => onStatusChange(item.id, val as ActionItem["status"])}
                            disabled={updatingItemId === item.id}
                          >
                            <SelectTrigger className="h-7 text-xs w-28 bg-card border-border rounded-lg">
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
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Dependency Blocked Banner */}
                      {depStatus?.isBlocked && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
                          <Link2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>
                            <strong>Blocked by:</strong> {depStatus.incomplete.map((p) => p.task).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Subtasks Progress Bar & Checklist Toggle */}
                      {subtasks.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between text-xs">
                            <button
                              onClick={() => toggleChecklist(item.id)}
                              className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                              <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Subtasks ({completedSubtasks}/{subtasks.length})</span>
                              {isChecklistOpen ? (
                                <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {Math.round(subtaskProgress)}%
                            </span>
                          </div>
                          <Progress value={subtaskProgress} className="h-1.5" />

                          {/* Expandable Subtask Checklist */}
                          <AnimatePresence>
                            {isChecklistOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 pt-2 pl-2"
                              >
                                {subtasks.map((st) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 text-xs text-foreground hover:bg-muted/40 p-1.5 rounded-md cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={(e) => onToggleSubtask?.(item.id, st.id, e.target.checked)}
                                      className="rounded border-border text-primary focus:ring-ring"
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

                      {/* Bottom Info Bar: Assignee & Due Date */}
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span className="font-medium text-foreground">{item.owner}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>Due: <strong className="text-foreground">{item.dueDate}</strong></span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
