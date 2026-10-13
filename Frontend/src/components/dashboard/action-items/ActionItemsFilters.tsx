import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  AlertTriangle,
  LayoutList,
  Kanban,
  CalendarRange,
  LayoutGrid,
  X,
  User,
  RotateCcw,
  SlidersHorizontal,
  CircleDot,
  Flame,
} from "lucide-react";
import { ActionTrackerViewMode } from "./types";

export type { ActionTrackerViewMode };

interface ActionItemsFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  selectedPriority: string;
  setSelectedPriority: (val: string) => void;
  selectedOwner: string;
  setSelectedOwner: (val: string) => void;
  showOverdueOnly: boolean;
  setShowOverdueOnly: (val: boolean) => void;
  uniqueOwners: string[];
  viewMode?: ActionTrackerViewMode;
  setViewMode?: (mode: ActionTrackerViewMode) => void;
}

export function ActionItemsFilters({
  searchQuery,
  setSearchQuery,
  selectedStatus,
  setSelectedStatus,
  selectedPriority,
  setSelectedPriority,
  selectedOwner,
  setSelectedOwner,
  showOverdueOnly,
  setShowOverdueOnly,
  uniqueOwners,
  viewMode = "table",
  setViewMode,
}: ActionItemsFiltersProps) {
  // Count active non-default filters
  const activeFilterCount = [
    selectedStatus !== "All",
    selectedPriority !== "All",
    selectedOwner !== "All",
    showOverdueOnly,
    searchQuery.trim() !== "",
  ].filter(Boolean).length;

  const handleResetAll = () => {
    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedPriority("All");
    setSelectedOwner("All");
    setShowOverdueOnly(false);
  };

  return (
    <div className="bg-card p-3.5 sm:p-4 rounded-xl border border-border paper-sheet shadow-xs space-y-3">
      {/* Top Main Row: Search + Action Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search action items, owners, meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9.5 bg-background border-border focus-visible:ring-2 text-xs rounded-lg font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View Mode & Overdue Filter Button */}
        <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
          {/* Overdue Button */}
          <Button
            variant={showOverdueOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`flex items-center gap-1.5 text-xs h-9 px-3 font-semibold rounded-lg transition-all ${
              showOverdueOnly
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                : "border-border bg-card hover:bg-rose-500/10 text-foreground"
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${showOverdueOnly ? "text-white" : "text-rose-500"}`} />
            <span>Overdue</span>
          </Button>

          {/* 4 View Mode Switcher */}
          {setViewMode && (
            <div className="flex items-center p-1 rounded-lg bg-muted border border-border">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Kanban Board View"
              >
                <Kanban className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Timeline / Gantt Roadmap View"
              >
                <CalendarRange className="h-3.5 w-3.5 text-blue-500" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Eisenhower Priority Matrix View"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Matrix</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Restructured Inline Filters Section */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Header Label */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>

          {/* Status Dropdown */}
          <Select value={selectedStatus} onValueChange={(v) => v && setSelectedStatus(v)}>
            <SelectTrigger
              className={`h-8.5 text-xs px-3 rounded-xl border transition-all ${
                selectedStatus !== "All"
                  ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CircleDot className="h-3 w-3 text-indigo-500 shrink-0" />
                <SelectValue placeholder="Status: All" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Dropdown */}
          <Select value={selectedPriority} onValueChange={(v) => v && setSelectedPriority(v)}>
            <SelectTrigger
              className={`h-8.5 text-xs px-3 rounded-xl border transition-all ${
                selectedPriority !== "All"
                  ? "bg-amber-50/80 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold"
                  : "bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-amber-500 shrink-0" />
                <SelectValue placeholder="Priority: All" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
              <SelectItem value="All">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Owner Dropdown */}
          <Select value={selectedOwner} onValueChange={(v) => v && setSelectedOwner(v)}>
            <SelectTrigger
              className={`h-8.5 text-xs px-3 rounded-xl border transition-all ${
                selectedOwner !== "All"
                  ? "bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : "bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-emerald-500 shrink-0" />
                <SelectValue placeholder="Owner: All" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
              <SelectItem value="All">All Owners</SelectItem>
              {uniqueOwners.map((owner) => (
                <SelectItem key={owner} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Reset & Count */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80"
            >
              {activeFilterCount} Active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-8 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
