import { useState, useEffect } from "react";
import { ActionItem, Meeting, SubTask } from "@/types/meeting";
import { ActionItemWithContext } from "./action-items/types";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, CheckSquare, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AppUser {
  id: string;
  name: string;
  email: string;
}

interface CreateActionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<ActionItem> & { meetingId: string; subtasks?: SubTask[]; dependsOn?: string[] }) => Promise<void> | void;
  meetings: Meeting[];
  initialData?: (ActionItem & { meetingId?: string; id?: string; subtasks?: SubTask[]; dependsOn?: string[] }) | null;
  availableActionItems?: ActionItemWithContext[];
  isSubmitting?: boolean;
}

export function CreateActionItemModal({
  isOpen,
  onClose,
  onSave,
  meetings,
  initialData,
  availableActionItems = [],
  isSubmitting = false,
}: CreateActionItemModalProps) {
  const [task, setTask] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [owner, setOwner] = useState("Unassigned");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<ActionItem["priority"]>("Medium");
  const [status, setStatus] = useState<ActionItem["status"]>("Open");
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // Fetch registered application users for Assignee dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/auth/users");
        if (Array.isArray(res.data)) {
          setAppUsers(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch registered users for assignee dropdown:", err);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Sync state on modal open or initialData change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTask(initialData.task || "");
        setMeetingId(initialData.meetingId || meetings[0]?.id || "");
        setOwner(initialData.owner || "Unassigned");
        setDueDate(initialData.dueDate || "");
        setPriority(initialData.priority || "Medium");
        setStatus(initialData.status || "Open");
        setSubtasks(initialData.subtasks || []);
        setDependsOn(initialData.dependsOn || []);
      } else {
        setTask("");
        setMeetingId(meetings[0]?.id || "");
        setOwner("Unassigned");
        setDueDate("");
        setPriority("Medium");
        setStatus("Open");
        setSubtasks([]);
        setDependsOn([]);
      }
      setNewSubtaskTitle("");
    }
  }, [isOpen, initialData, meetings]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleToggleDependency = (depId: string) => {
    if (dependsOn.includes(depId)) {
      setDependsOn(dependsOn.filter((id) => id !== depId));
    } else {
      setDependsOn([...dependsOn, depId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim() || !meetingId) return;

    try {
      setLocalSubmitting(true);
      await onSave({
        ...(initialData?.id ? { id: initialData.id } : {}),
        meetingId,
        task: task.trim(),
        owner: owner.trim() || "Unassigned",
        dueDate: dueDate.trim() || "Not specified",
        priority,
        status,
        subtasks,
        dependsOn,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save action item:", err);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const eligibleDependencies = availableActionItems.filter((i) => i.id !== initialData?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl paper-sheet border border-border">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {initialData ? "Edit Action Item" : "Create Action Item"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {initialData
              ? "Update task details, checklists, dependencies, or status."
              : "Add a new task with checklist subtasks and dependencies."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Task Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task" className="text-xs sm:text-sm">
              Task Description
            </Label>
            <Input
              id="task"
              placeholder="e.g. Implement real-time notifications websocket"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              required
              className="text-xs sm:text-sm h-9 bg-background border-border"
            />
          </div>

          {/* Meeting Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="meeting" className="text-xs sm:text-sm">
              Associated Meeting
            </Label>
            <Select
              value={meetingId}
              onValueChange={(val) => {
                if (val && typeof val === "string") setMeetingId(val);
              }}
            >
              <SelectTrigger id="meeting" className="w-full text-xs sm:text-sm h-9 bg-background border-border">
                <SelectValue placeholder="Select meeting">
                  {meetings.find((m) => String(m.id) === String(meetingId))
                    ? `${meetings.find((m) => String(m.id) === String(meetingId))?.title} (${meetings.find((m) => String(m.id) === String(meetingId))?.date})`
                    : "Select meeting"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {meetings.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs sm:text-sm">
                    {m.title} ({m.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Owner / Assignee Select Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="owner" className="text-xs sm:text-sm">
                Assignee / Owner
              </Label>
              <Select
                value={owner}
                onValueChange={(val) => {
                  if (val && typeof val === "string") setOwner(val);
                }}
              >
                <SelectTrigger id="owner" className="w-full text-xs sm:text-sm h-9 bg-background border-border">
                  <SelectValue placeholder="Select assignee">{owner}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Unassigned" className="text-xs sm:text-sm">
                    Unassigned
                  </SelectItem>
                  {appUsers.map((user) => (
                    <SelectItem key={user.id} value={user.name} className="text-xs sm:text-sm">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs sm:text-sm">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate.includes("-") ? dueDate : ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs sm:text-sm h-9 bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="priority" className="text-xs sm:text-sm">
                Priority
              </Label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as ActionItem["priority"])}>
                <SelectTrigger id="priority" className="text-xs sm:text-sm h-9 bg-background border-border">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Low" className="text-xs sm:text-sm">Low</SelectItem>
                  <SelectItem value="Medium" className="text-xs sm:text-sm">Medium</SelectItem>
                  <SelectItem value="High" className="text-xs sm:text-sm">High</SelectItem>
                  <SelectItem value="Urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs sm:text-sm">
                Status
              </Label>
              <Select value={status} onValueChange={(val) => val && setStatus(val as ActionItem["status"])}>
                <SelectTrigger id="status" className="text-xs sm:text-sm h-9 bg-background border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Open" className="text-xs sm:text-sm">Open</SelectItem>
                  <SelectItem value="In Progress" className="text-xs sm:text-sm">In Progress</SelectItem>
                  <SelectItem value="Blocked" className="text-xs sm:text-sm">Blocked</SelectItem>
                  <SelectItem value="Completed" className="text-xs sm:text-sm">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subtasks / Checklist Builder */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs sm:text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-indigo-500" />
                Subtasks Checklist ({subtasks.length})
              </span>
            </Label>

            {/* Subtask Input + Add Button */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add subtask step (e.g. Write unit tests)"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="text-xs h-8.5 bg-background border-border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSubtask}
                className="h-8.5 text-xs px-3 shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* Subtasks List */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-muted/30 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={(e) => {
                          setSubtasks(
                            subtasks.map((s) => (s.id === st.id ? { ...s, completed: e.target.checked } : s))
                          );
                        }}
                        className="rounded border-border text-primary focus:ring-ring"
                      />
                      <span className={st.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Dependencies */}
          {eligibleDependencies.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-amber-500" />
                Dependencies (Prerequisite Tasks)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Select tasks that must be completed before this task can proceed:
              </p>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {eligibleDependencies.map((depItem) => {
                  const isSelected = dependsOn.includes(depItem.id);
                  return (
                    <button
                      key={depItem.id}
                      type="button"
                      onClick={() => handleToggleDependency(depItem.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200 font-semibold"
                          : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[200px]">{depItem.task}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || localSubmitting}
              className="w-full sm:w-auto h-9 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || localSubmitting}
              className="w-full sm:w-auto h-9 text-xs sm:text-sm"
            >
              {(isSubmitting || localSubmitting) && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {initialData ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
