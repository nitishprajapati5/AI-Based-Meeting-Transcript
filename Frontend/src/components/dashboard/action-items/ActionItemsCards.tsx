"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ActionItem } from "@/types/meeting";
import { ActionItemWithContext } from "./types";
import { getPriorityBadgeClass } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { User, Calendar, Edit, Trash2, Loader2, CheckSquare, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyActionItemsIllustration } from "@/components/ui/illustrations";

interface ActionItemsCardsProps {
  isLoading: boolean;
  isFetching: boolean;
  displayItems: ActionItemWithContext[];
  allItems?: ActionItemWithContext[];
  updatingItemId: string | null;
  onStatusChange: (id: string, newStatus: ActionItem["status"]) => void;
  onToggleSubtask?: (itemId: string, subtaskId: string, completed: boolean) => void;
  onEdit: (item: ActionItemWithContext) => void;
  onDelete: (item: ActionItemWithContext) => void;
}

export function ActionItemsCards({
  isLoading,
  isFetching,
  displayItems,
  allItems = [],
  updatingItemId,
  onStatusChange,
  onToggleSubtask,
  onEdit,
  onDelete,
}: ActionItemsCardsProps) {
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

  return (
    <div className="md:hidden space-y-3">
      {isLoading || isFetching ? (
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
          <span className="text-xs font-medium text-muted-foreground">Loading fresh action items...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground flex flex-col items-center justify-center space-y-3">
          <EmptyActionItemsIllustration className="w-20 h-20 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-bold text-foreground">No action items found matching your filters.</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing search parameters or overdue filter.</p>
          </div>
        </div>
      ) : (
        displayItems.map((item, idx) => {
          const depStatus = getDependencyStatus(item);
          const subtasks = item.subtasks || [];
          const completedSubtasks = subtasks.filter((s) => s.completed).length;
          const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
          const isChecklistOpen = expandedChecklists[item.id];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`p-4 rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 transition-colors ${
                item.isOverdue ? "border-destructive/40 bg-destructive/5" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm font-bold text-foreground leading-snug ${item.status === "Completed" ? "line-through text-muted-foreground" : ""}`}
                >
                  {item.task}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {item.meetingTitle && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal px-2 py-0.5 border border-border bg-muted/40 text-muted-foreground rounded-md"
                  >
                    {item.meetingTitle}
                  </Badge>
                )}
                {depStatus?.isBlocked && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 gap-1 rounded-md"
                  >
                    <Link2 className="h-3 w-3" /> Blocked
                  </Badge>
                )}
              </div>

              {/* Subtasks Progress */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => toggleChecklist(item.id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                      Checklist ({completedSubtasks}/{subtasks.length})
                    </span>
                    {isChecklistOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <Progress value={subtaskProgress} className="h-1" />

                  {isChecklistOpen && (
                    <div className="space-y-1 pt-1 bg-muted/40 p-2 rounded-lg border border-border">
                      {subtasks.map((st) => (
                        <label
                          key={st.id}
                          className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-muted/60 p-1 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={(e) => onToggleSubtask?.(item.id, st.id, e.target.checked)}
                            className="rounded border-border text-primary focus:ring-ring h-3 w-3"
                          />
                          <span className={st.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                            {st.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <User className="h-3.5 w-3.5" />
                  {item.owner}
                </span>
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{item.dueDate}</span>
                  {item.isOverdue && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold ml-1 rounded-md">
                      OVERDUE
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold rounded-md px-2 py-0.5 ${getPriorityBadgeClass(item.priority)}`}
                >
                  {item.priority}
                </Badge>

                <Select
                  value={item.status}
                  disabled={updatingItemId === item.id}
                  onValueChange={(val) => val && onStatusChange(item.id, val as ActionItem["status"])}
                >
                  <SelectTrigger className="h-7 text-xs w-28 border-border bg-background">
                    {updatingItemId === item.id ? (
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[10px]">Updating</span>
                      </div>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
