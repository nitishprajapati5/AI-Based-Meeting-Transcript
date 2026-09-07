"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { callService } from "@/lib/serviceApi";
import { SERVICE_IDS } from "@/lib/serviceIds";
import { ActionItem, Meeting } from "@/types/meeting";
import { exportActionItemsToCSV, exportActionItemsToMarkdown } from "@/lib/exportUtils";
import { triggerTaskCompletionConfetti } from "@/lib/confetti";
import { ActionItemsLeaderboard } from "@/components/dashboard/action-items/ActionItemsLeaderboard";
import { CreateActionItemModal } from "@/components/dashboard/CreateActionItemModal";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActionItemWithContext,
  checkIsOverdue,
  stripHtml,
  ActionItemsHeader,
  ActionItemsMetricsCards,
  ActionItemsFilters,
  ActionTrackerViewMode,
  ActionItemsTable,
  ActionItemsCards,
  ActionItemsKanban,
  ActionItemsTimeline,
  ActionItemsMatrix,
  ActionItemsPagination,
  DeleteActionItemModal,
} from "@/components/dashboard/action-items";
import { config } from "@/lib/config";

export default function ActionTrackerPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedOwner, setSelectedOwner] = useState<string>("All");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ActionTrackerViewMode>("table");

  // Pagination constant
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(ActionItem & { meetingId?: string; id?: string }) | null>(null);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ActionItemWithContext | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // TanStack Query for Meetings (referenced by action items)
  const { data: meetingsData } = useQuery({
    queryKey: ["meetingsList"],
    queryFn: async () => {
      const resData = await callService({
        serviceId: SERVICE_IDS.MEETINGS.LIST,
      });
      return resData?.data || resData;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const meetings: Meeting[] = Array.isArray(meetingsData) ? meetingsData : [];

  // TanStack Query for Action Items (Always fetch fresh data from API)
  const {
    data: actionItemsResponse,
    isLoading,
    isFetching: isActionItemsFetching,
  } = useQuery({
    queryKey: ["actionItems", currentPage],
    queryFn: async () => {
      return await callService({
        serviceId: SERVICE_IDS.ACTION_ITEMS.LIST,
        query: { page: currentPage, limit: ITEMS_PER_PAGE },
      });
    },
    staleTime: 0, // Always stale so fresh data is fetched on every mount/query call
    refetchOnMount: "always",
  });

  const rawItems = Array.isArray(actionItemsResponse?.data)
    ? actionItemsResponse.data
    : Array.isArray(actionItemsResponse)
      ? actionItemsResponse
      : [];

  const actionItems: ActionItemWithContext[] = rawItems.map((item: any) => ({
    id: item.id || `item-${Math.random()}`,
    meetingId: item.meetingId || "1",
    meetingTitle: meetings.find((m) => m.id === item.meetingId)?.title || "General Meeting",
    task: stripHtml(item.task),
    owner: stripHtml(item.owner) || "Unassigned",
    dueDate: stripHtml(item.dueDate) || "Not specified",
    priority: item.priority || "Medium",
    status: item.status || "Open",
    subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
    dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn : [],
    isOverdue: checkIsOverdue(item.dueDate, item.status),
  }));

  const totalPages: number = actionItemsResponse?.pagination?.totalPages || 1;
  const totalItems: number = actionItemsResponse?.pagination?.total || actionItems.length;

  // Track specific item ID currently being updated
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // TanStack Mutations for create/update/delete
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ActionItem["status"] }) => {
      setUpdatingItemId(id);
      await callService({
        serviceId: SERVICE_IDS.ACTION_ITEMS.UPDATE,
        params: { id },
        payload: { status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItemsLeaderboard"] });

      toast.success(`Task status updated to "${variables.status}"`);
    },
    onError: (err) => {
      toast.error("Failed to update task status");
      console.error("Status update error:", err);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
  });

  const saveActionItemMutation = useMutation({
    mutationFn: async (itemData: Partial<ActionItem> & { meetingId: string }) => {
      if (itemData.id) {
        setUpdatingItemId(itemData.id);
        await callService({
          serviceId: SERVICE_IDS.ACTION_ITEMS.UPDATE,
          params: { id: itemData.id },
          payload: itemData,
        });
      } else {
        await callService({
          serviceId: SERVICE_IDS.ACTION_ITEMS.CREATE,
          payload: itemData,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItemsLeaderboard"] });

      toast.success(variables.id ? "Action item updated successfully" : "Action item created successfully");
    },
    onError: (err) => {
      toast.error("Failed to save action item");
      console.error("Save action item error:", err);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
  });

  const deleteActionItemMutation = useMutation({
    mutationFn: async (id: string) => {
      setUpdatingItemId(id);
      await callService({
        serviceId: SERVICE_IDS.ACTION_ITEMS.DELETE,
        params: { id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItemsLeaderboard"] });

      toast.success("Action item deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete action item");
      console.error("Delete action item error:", err);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
  });

  const handleBulkStatusChange = async (ids: string[], newStatus: ActionItem["status"]) => {
    setIsBulkUpdating(true);
    const promise = (async () => {
      try {
        await Promise.all(
          ids.map((id) =>
            callService({
              serviceId: SERVICE_IDS.ACTION_ITEMS.UPDATE,
              params: { id },
              payload: { status: newStatus },
            })
          )
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["actionItems"] }),
          queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] }),
          queryClient.invalidateQueries({ queryKey: ["actionItemsLeaderboard"] }),
        ]);
      } finally {
        setIsBulkUpdating(false);
      }
    })();

    toast.promise(promise, {
      loading: "Bulk updating task status...",
      success: `Successfully updated ${ids.length} task(s) to "${newStatus}"!`,
      error: "Failed to update selected tasks.",
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    setIsBulkUpdating(true);
    const promise = (async () => {
      try {
        await Promise.all(
          ids.map((id) =>
            callService({
              serviceId: SERVICE_IDS.ACTION_ITEMS.DELETE,
              params: { id },
            })
          )
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["actionItems"] }),
          queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] }),
          queryClient.invalidateQueries({ queryKey: ["actionItemsLeaderboard"] }),
        ]);
      } finally {
        setIsBulkUpdating(false);
      }
    })();

    toast.promise(promise, {
      loading: "Bulk deleting selected tasks...",
      success: `Successfully deleted ${ids.length} task(s)!`,
      error: "Failed to delete selected tasks.",
    });
  };

  const isDeleting = deleteActionItemMutation.isPending;

  // Extract unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    actionItems.forEach((item) => {
      if (item.owner) set.add(item.owner);
    });
    return Array.from(set);
  }, [actionItems]);

  // Client-side filtering for search and filters
  const filteredItems = useMemo(() => {
    return actionItems.filter((item) => {
      const matchesSearch =
        item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;

      const matchesPriority = selectedPriority === "All" || item.priority === selectedPriority;

      const matchesOwner = selectedOwner === "All" || item.owner === selectedOwner;

      const matchesOverdue = !showOverdueOnly || item.isOverdue;

      return matchesSearch && matchesStatus && matchesPriority && matchesOwner && matchesOverdue;
    });
  }, [actionItems, searchQuery, selectedStatus, selectedPriority, selectedOwner, showOverdueOnly]);

  const displayItems = filteredItems;

  // TanStack Query for all action items metrics (unpaginated count - always fresh)
  const {
    data: allMetricsData,
    isLoading: isMetricsLoading,
    isFetching: isMetricsFetching,
  } = useQuery({
    queryKey: ["allActionItemsMetrics"],
    queryFn: async () => {
      const res = await api.get("/action-items", {
        params: { page: 1, limit: 1000 },
      });
      return res.data?.data || res.data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const allActionItems: ActionItemWithContext[] = useMemo(() => {
    const raw = Array.isArray(allMetricsData) ? allMetricsData : [];
    return raw.map((item: any) => ({
      id: item.id || `item-${Math.random()}`,
      meetingId: item.meetingId || "1",
      meetingTitle: "General Meeting",
      task: stripHtml(item.task),
      owner: stripHtml(item.owner) || "Unassigned",
      dueDate: stripHtml(item.dueDate) || "Not specified",
      priority: item.priority || "Medium",
      status: item.status || "Open",
      isOverdue: checkIsOverdue(item.dueDate, item.status),
    }));
  }, [allMetricsData]);

  const metrics = useMemo(() => {
    const total = allActionItems.length;
    const inProgress = allActionItems.filter((i) => i.status === "In Progress").length;
    const blocked = allActionItems.filter((i) => i.status === "Blocked").length;
    const overdue = allActionItems.filter((i) => i.isOverdue).length;

    return { total, inProgress, blocked, overdue };
  }, [allActionItems]);

  // Status Change Handler
  const handleStatusChange = async (id: string, newStatus: ActionItem["status"]) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      if (newStatus === "Completed") {
        triggerTaskCompletionConfetti();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Subtask toggle mutation
  const handleToggleSubtask = async (itemId: string, subtaskId: string, completed: boolean) => {
    const item = actionItems.find((i) => i.id === itemId);
    if (!item) return;

    const updatedSubtasks = (item.subtasks || []).map((st) => (st.id === subtaskId ? { ...st, completed } : st));

    try {
      await callService({
        serviceId: SERVICE_IDS.ACTION_ITEMS.UPDATE,
        params: { id: itemId },
        payload: { subtasks: updatedSubtasks },
      });
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
    } catch (err) {
      toast.error("Failed to update subtask");
      console.error("Subtask toggle error:", err);
    }
  };

  // Create / Edit Handler
  const handleSaveItem = async (
    itemData: Partial<ActionItem> & { meetingId: string; subtasks?: any[]; dependsOn?: string[] }
  ) => {
    try {
      await saveActionItemMutation.mutateAsync(itemData);
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to save action item:", err);
    }
  };

  // Open delete modal
  const handleOpenDeleteModal = (item: ActionItemWithContext) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteActionItemMutation.mutateAsync(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Failed to delete action item:", err);
    }
  };

  const isFilterActive =
    Boolean(searchQuery) ||
    selectedStatus !== "All" ||
    selectedPriority !== "All" ||
    selectedOwner !== "All" ||
    showOverdueOnly;

  return (
    <div className="space-y-8 mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Page Title */}
      <ActionItemsHeader
        isSyncing={isActionItemsFetching || isMetricsFetching}
        onAddClick={() => {
          setEditingItem(null);
          setIsModalOpen(true);
        }}
        onExportCSV={() => {
          if (displayItems.length === 0) {
            toast.error("No action items available to export");
            return;
          }
          exportActionItemsToCSV(displayItems);
          toast.success(`Exported ${displayItems.length} action items to CSV`);
        }}
        onExportMarkdown={() => {
          if (displayItems.length === 0) {
            toast.error("No action items available to export");
            return;
          }
          exportActionItemsToMarkdown(displayItems);
          toast.success(`Exported ${displayItems.length} action items to Markdown`);
        }}
      />

      {/* Metric Cards */}
      <ActionItemsMetricsCards metrics={metrics} isLoading={isMetricsLoading || isMetricsFetching} />

      {/* Team Velocity Leaderboard */}
      {config.NEXT_PUBLIC_SHOW_TEAM_CONRIBUTION && <ActionItemsLeaderboard />}

      {/* Control Bar: Search & Multi-Filters */}
      <ActionItemsFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedPriority={selectedPriority}
        setSelectedPriority={setSelectedPriority}
        selectedOwner={selectedOwner}
        setSelectedOwner={setSelectedOwner}
        showOverdueOnly={showOverdueOnly}
        setShowOverdueOnly={setShowOverdueOnly}
        uniqueOwners={uniqueOwners}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Dynamic View Mode Renderer */}
      {viewMode === "kanban" ? (
        /* Kanban Board View */
        <ActionItemsKanban
          isLoading={isLoading}
          displayItems={displayItems}
          allItems={actionItems}
          updatingItemId={updatingItemId}
          onStatusChange={handleStatusChange}
          onToggleSubtask={handleToggleSubtask}
          onEdit={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDelete={handleOpenDeleteModal}
        />
      ) : viewMode === "timeline" ? (
        /* Timeline / Gantt Roadmap View */
        <ActionItemsTimeline
          isLoading={isLoading}
          displayItems={displayItems}
          allItems={actionItems}
          updatingItemId={updatingItemId}
          onStatusChange={handleStatusChange}
          onToggleSubtask={handleToggleSubtask}
          onEdit={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDelete={handleOpenDeleteModal}
        />
      ) : viewMode === "matrix" ? (
        /* Eisenhower Matrix 4-Quadrant View */
        <ActionItemsMatrix
          isLoading={isLoading}
          displayItems={displayItems}
          allItems={actionItems}
          updatingItemId={updatingItemId}
          onStatusChange={handleStatusChange}
          onToggleSubtask={handleToggleSubtask}
          onEdit={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDelete={handleOpenDeleteModal}
        />
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <ActionItemsTable
            isLoading={isLoading}
            isFetching={isActionItemsFetching}
            displayItems={displayItems}
            allItems={actionItems}
            updatingItemId={updatingItemId}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={handleOpenDeleteModal}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkDelete={handleBulkDelete}
            isBulkUpdating={isBulkUpdating}
          />

          {/* Mobile Responsive Cards View */}
          <ActionItemsCards
            isLoading={isLoading}
            isFetching={isActionItemsFetching}
            displayItems={displayItems}
            allItems={actionItems}
            updatingItemId={updatingItemId}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={handleOpenDeleteModal}
          />
        </>
      )}

      {/* Pagination Controls / Filter Info */}
      <ActionItemsPagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        isFilterActive={isFilterActive}
        displayCount={displayItems.length}
        disabled={isBulkUpdating}
      />

      {/* Create / Edit Modal */}
      <CreateActionItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        meetings={meetings}
        initialData={editingItem}
        availableActionItems={actionItems}
      />

      {/* Delete Confirmation Modal */}
      <DeleteActionItemModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        itemToDelete={itemToDelete}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
