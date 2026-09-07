import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActionItem, SubTask } from "@/types/meeting";
import { ActionItemWithContext } from "./types";
import { getPriorityBadgeClass } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  User,
  Calendar,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  CheckSquare,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ActionItemsKanbanProps {
  isLoading: boolean;
  displayItems: ActionItemWithContext[];
  allItems?: ActionItemWithContext[];
  updatingItemId: string | null;
  onStatusChange: (id: string, newStatus: ActionItem["status"]) => void;
  onToggleSubtask?: (itemId: string, subtaskId: string, completed: boolean) => void;
  onEdit: (item: ActionItemWithContext) => void;
  onDelete: (item: ActionItemWithContext) => void;
}

const COLUMNS: {
  id: ActionItem["status"];
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badgeClass: string;
}[] = [
  {
    id: "Open",
    title: "Open Tasks",
    icon: Circle,
    colorClass: "border-border bg-muted/30",
    badgeClass: "bg-muted text-foreground border border-border",
  },
  {
    id: "In Progress",
    title: "In Progress",
    icon: Clock,
    colorClass: "border-blue-500/20 bg-blue-500/5",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  },
  {
    id: "Blocked",
    title: "Blocked",
    icon: AlertCircle,
    colorClass: "border-rose-500/20 bg-rose-500/5",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  },
  {
    id: "Completed",
    title: "Completed",
    icon: CheckCircle2,
    colorClass: "border-emerald-500/20 bg-emerald-500/5",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  },
];

export function ActionItemsKanban({
  isLoading,
  displayItems,
  allItems = [],
  updatingItemId,
  onStatusChange,
  onToggleSubtask,
  onEdit,
  onDelete,
}: ActionItemsKanbanProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ActionItem["status"] | null>(null);
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ActionItem["status"]) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ActionItem["status"]) => {
    e.preventDefault();
    setDragOverColumn(null);
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;

    if (itemId) {
      const item = displayItems.find((i) => i.id === itemId);
      if (item && item.status !== targetColumn) {
        onStatusChange(itemId, targetColumn);
      }
    }
    setDraggedItemId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border text-muted-foreground min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm font-semibold">Loading Kanban Board...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const columnItems = displayItems.filter((i) => i.status === col.id);
        const isOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-2xl border ${col.colorClass} p-4 min-h-[500px] transition-all duration-200 ${
              isOver ? "ring-2 ring-primary/50 scale-[1.01]" : ""
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
              </div>
              <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${col.badgeClass}`}>
                {columnItems.length}
              </Badge>
            </div>

            {/* Column Cards Drop Area */}
            <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
              <AnimatePresence>
                {columnItems.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground font-medium">
                    Drop items here
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const depStatus = getDependencyStatus(item);
                    const subtasks = item.subtasks || [];
                    const completedSubtasks = subtasks.filter((s) => s.completed).length;
                    const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
                    const isChecklistOpen = expandedChecklists[item.id];

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e as any, item.id)}
                        className={`group relative p-3.5 rounded-xl border paper-sheet shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 ${
                          item.isOverdue
                            ? "border-red-500/30 bg-red-500/10"
                            : depStatus?.isBlocked
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border hover:border-ring"
                        } ${updatingItemId === item.id ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {/* Drag Handle Indicator */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[150px]">
                              {item.meetingTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                        {/* Task Text */}
                        <p className={`text-xs font-semibold text-foreground leading-snug ${item.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>
                          {item.task}
                        </p>

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
                          <div className="space-y-1 pt-1 border-t border-border/40">
                            <div className="flex items-center justify-between text-[10px]">
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
                                  className="space-y-1 pt-1 pl-1"
                                >
                                  {subtasks.map((st) => (
                                    <label
                                      key={st.id}
                                      className="flex items-center gap-1.5 text-[10px] text-foreground hover:bg-muted/40 p-1 rounded cursor-pointer transition-colors"
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

                        {/* Footer Metadata */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <User className="h-3 w-3 text-muted-foreground/70" />
                            <span className="truncate max-w-[90px]">{item.owner}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-semibold px-1.5 py-0 rounded-md border ${getPriorityBadgeClass(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </Badge>
                            {item.dueDate && (
                              <span
                                className={`flex items-center gap-1 text-[10px] font-semibold ${
                                  item.isOverdue ? "text-rose-500" : "text-muted-foreground"
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {item.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
