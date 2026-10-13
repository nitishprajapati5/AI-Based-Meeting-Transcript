"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Meeting } from "@/types/meeting";
import { exportMeetingsToCSV } from "@/lib/exportUtils";
import { MeetingModal } from "@/components/dashboard/MeetingModal";

import { MeetingDetailModal } from "@/components/dashboard/MeetingDetailModal";
import api from "@/lib/axios";
import { callService } from "@/lib/serviceApi";
import { SERVICE_IDS } from "@/lib/serviceIds";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MeetingsHeader,
  MeetingsFilters,
  MeetingsTable,
  MeetingsCards,
  MeetingsPagination,
  DeleteMeetingModal,
  ArchiveMeetingModal,
  MeetingComparisonModal,
} from "@/components/dashboard/meetings";
import { AssignSeriesModal } from "@/components/dashboard/series";

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination constant
  const ITEMS_PER_PAGE = 10;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [meetingToArchive, setMeetingToArchive] = useState<Meeting | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [assignSeriesMeeting, setAssignSeriesMeeting] = useState<Meeting | null>(null);
  const [isAssignSeriesOpen, setIsAssignSeriesOpen] = useState(false);

  // TanStack Query for Meetings with Caching
  const { data: meetingsResponse, isLoading } = useQuery({
    queryKey: ["meetings", currentPage],
    queryFn: async () => {
      return await callService({
        serviceId: SERVICE_IDS.MEETINGS.LIST,
        query: { page: currentPage, limit: ITEMS_PER_PAGE },
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Series list for AssignSeriesModal
  const { data: seriesListRaw = [] } = useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const res = await callService({ serviceId: SERVICE_IDS.SERIES.LIST });
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
  const seriesList: any[] = seriesListRaw;

  const meetings: Meeting[] = Array.isArray(meetingsResponse?.data)
    ? meetingsResponse.data
    : Array.isArray(meetingsResponse)
      ? meetingsResponse
      : [];

  const totalPages: number = meetingsResponse?.pagination?.totalPages || 1;
  const totalItems: number = meetingsResponse?.pagination?.total || meetings.length;

  // Active background jobs being processed
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);

  // Poll active jobs and refresh list upon completion
  useEffect(() => {
    if (activeJobIds.length === 0) return;

    const interval = setInterval(async () => {
      let shouldRefresh = false;
      const remainingJobIds: string[] = [];

      for (const jobId of activeJobIds) {
        try {
          const resData = await callService({
            serviceId: SERVICE_IDS.JOBS.GET,
            params: { id: jobId },
          });
          const status = resData?.status;

          if (status === "completed" || status === "failed") {
            shouldRefresh = true;
            if (status === "completed") {
              toast.success("AI Summary & Action Items processing completed!");
            } else {
              toast.error("AI Summary background job failed.");
            }
          } else {
            remainingJobIds.push(jobId);
          }
        } catch (err) {
          console.error("Failed checking job status:", err);
        }
      }

      setActiveJobIds(remainingJobIds);

      if (shouldRefresh) {
        queryClient.invalidateQueries({ queryKey: ["meetings"] });
        queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        queryClient.invalidateQueries({ queryKey: ["actionItems"] });
        queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJobIds, queryClient]);

  // TanStack Mutation for Save / Create Meeting
  const saveMeetingMutation = useMutation<{ jobId?: string }, Error, Partial<Meeting>>({
    mutationFn: async (meetingData: Partial<Meeting>) => {
      if (meetingData.id) {
        const resData = await callService<Meeting>({
          serviceId: SERVICE_IDS.MEETINGS.UPDATE,
          params: { id: meetingData.id },
          payload: meetingData,
        });
        return resData as { jobId?: string };
      } else {
        const resData = await callService<{ jobId?: string } & Meeting>({
          serviceId: SERVICE_IDS.MEETINGS.CREATE,
          payload: meetingData,
        });
        return resData;
      }
    },
    onSuccess: (data, variables) => {
      if (data?.jobId) {
        setActiveJobIds((prev) => [...prev, data.jobId!]);
        toast.info("Meeting saved! Generating AI Summary in background...");
      } else {
        toast.success(variables.id ? "Meeting updated successfully" : "Meeting created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      if (!variables.id) setCurrentPage(1);
    },
    onError: (error) => {
      console.error("Failed to save meeting to database:", error);
      toast.error("Failed to save meeting. Please check server connection.");
    },
  });

  const handleSaveMeeting = async (meetingData: Partial<Meeting>) => {
    await saveMeetingMutation.mutateAsync(meetingData);
    setIsFormModalOpen(false);
  };

  const ArchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await callService({
        serviceId: SERVICE_IDS.MEETINGS.ARCHIVE,
        params: { id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      toast.success("Meeting Archived successfully");
    },
    onError: (error) => {
      console.error("Failed to archive meeting:", error);
      toast.error("Failed to Archive Meeting");
    },
  });

  const PinMutationChanges = useMutation({
    mutationFn: async (id: string) => {
      await callService({
        serviceId: SERVICE_IDS.MEETINGS.PIN,
        params: { id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
      toast.success("Pin status updated successfully");
    },
    onError: (error) => {
      console.error("Failed to pin/unpin meeting:", error);
      toast.error("Failed to update pin status");
    },
  });

  const handleTogglePin = (meeting: Meeting) => {
    PinMutationChanges.mutate(meeting.id);
  };

  const pinningMeetingId = PinMutationChanges.isPending ? (PinMutationChanges.variables ?? null) : null;

  const CloneMeetingMutation = useMutation({
    mutationFn: async (meeting: Meeting) => {
      await callService({
        serviceId: SERVICE_IDS.MEETINGS.CLONE,
        payload: { meeting },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      toast.success("Clone Created of Meeting");
    },
    onError: (error) => {
      console.log("Failed to Create a Clone of Meeting", error);
      toast.error("Could Not Clone the Meeting Successfully.");
    },
  });

  const IsCloneMeetingLoading = CloneMeetingMutation.isPending;

  const handleCreatingClone = async (meeting: Meeting) => {
    CloneMeetingMutation.mutateAsync(meeting);
  };

  // TanStack Mutation for Delete Meeting
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      await callService({
        serviceId: SERVICE_IDS.MEETINGS.DELETE,
        params: { id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetingsList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["actionItems"] });
      queryClient.invalidateQueries({ queryKey: ["allActionItemsMetrics"] });
      toast.success("Meeting deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete meeting:", error);
      toast.error("Failed to delete meeting");
    },
  });

  const isDeleting = deleteMeetingMutation.isPending;
  const isArchiving = ArchiveMutation.isPending;

  // Assign / remove meeting from series mutations
  const assignSeriesMutation = useMutation({
    mutationFn: async ({ meetingId, seriesId }: { meetingId: string; seriesId: string }) => {
      await callService({
        serviceId: SERVICE_IDS.SERIES.ASSIGN_MEETING,
        payload: { meetingId, seriesId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Meeting assigned to series!");
      setIsAssignSeriesOpen(false);
    },
    onError: () => toast.error("Failed to assign meeting to series"),
  });

  const removeSeriesMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      await callService({
        serviceId: SERVICE_IDS.SERIES.REMOVE_MEETING,
        payload: { meetingId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Meeting removed from series");
      setIsAssignSeriesOpen(false);
    },
    onError: () => toast.error("Failed to remove meeting from series"),
  });

  // Client-side filtering (for search and type filter)
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesSearch =
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.participants.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (meeting.transcript && meeting.transcript.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === "All" || meeting.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [meetings, searchQuery, selectedType]);

  const displayMeetings = useMemo(() => {
    return [...filteredMeetings].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [filteredMeetings]);

  // Open delete confirmation modal
  const handleOpenDeleteModal = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    try {
      await deleteMeetingMutation.mutateAsync(meetingToDelete.id);
      setIsDeleteModalOpen(false);
      setMeetingToDelete(null);
    } catch (error) {
      console.error("Failed to delete meeting from database:", error);
    }
  };

  const isFilterActive = Boolean(searchQuery) || selectedType !== "All";

  // Open archive confirmation modal
  const handleOpenArchiveModal = (meeting: Meeting) => {
    setMeetingToArchive(meeting);
    setIsArchiveModalOpen(true);
  };

  // Confirm archive action
  const handleConfirmArchive = async () => {
    if (!meetingToArchive) return;
    try {
      await ArchiveMutation.mutateAsync(meetingToArchive.id);
      setIsArchiveModalOpen(false);
      setMeetingToArchive(null);
    } catch (error) {
      console.error("Failed to archive meeting:", error);
    }
  };

  return (
    <div className="space-y-8 mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <MeetingsHeader
        onCreateClick={() => {
          setEditingMeeting(null);
          setIsFormModalOpen(true);
        }}
        onCompareClick={() => setIsCompareModalOpen(true)}
        onExportCSV={() => {
          if (displayMeetings.length === 0) {
            toast.error("No meetings available to export");
            return;
          }
          exportMeetingsToCSV(displayMeetings);
          toast.success(`Exported ${displayMeetings.length} meetings to CSV`);
        }}
      />

      {/* Controls: Search and Filter */}
      <MeetingsFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
      />

      {/* Desktop & Tablet Table View */}
      <MeetingsTable
        isLoading={isLoading}
        displayMeetings={displayMeetings}
        onViewDetails={(meeting) => {
          setViewingMeeting(meeting);
          setIsDetailModalOpen(true);
        }}
        onEdit={(meeting) => {
          setEditingMeeting(meeting);
          setIsFormModalOpen(true);
        }}
        onDelete={handleOpenDeleteModal}
        onArchive={handleOpenArchiveModal}
        onTogglePin={handleTogglePin}
        pinningMeetingId={pinningMeetingId}
        handleCreatingClone={handleCreatingClone}
        IsCloneMeetingLoading={IsCloneMeetingLoading}
        onAssignSeries={(meeting) => {
          setAssignSeriesMeeting(meeting);
          setIsAssignSeriesOpen(true);
        }}
      />

      {/* Mobile Responsive Cards View */}
      <MeetingsCards
        isLoading={isLoading}
        displayMeetings={displayMeetings}
        onViewDetails={(meeting) => {
          setViewingMeeting(meeting);
          setIsDetailModalOpen(true);
        }}
        onEdit={(meeting) => {
          setEditingMeeting(meeting);
          setIsFormModalOpen(true);
        }}
        onDelete={handleOpenDeleteModal}
        onArchive={handleOpenArchiveModal}
        onTogglePin={handleTogglePin}
      />

      {/* Pagination Controls */}
      <MeetingsPagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        isFilterActive={isFilterActive}
        displayCount={displayMeetings.length}
        searchQuery={searchQuery}
        selectedType={selectedType}
      />

      {/* Form Modal (Create / Edit) */}
      <MeetingModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingMeeting(null);
        }}
        onSave={handleSaveMeeting}
        initialData={editingMeeting}
      />

      {/* Details Modal */}
      <MeetingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingMeeting(null);
        }}
        meeting={viewingMeeting}
        isSummarizing={!!(viewingMeeting && !viewingMeeting.summary && viewingMeeting.transcript)}
        onEdit={(meeting) => {
          setEditingMeeting(meeting);
          setIsFormModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMeetingModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setMeetingToDelete(null);
        }}
        meetingToDelete={meetingToDelete}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveMeetingModal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setMeetingToArchive(null);
        }}
        meetingToArchive={meetingToArchive}
        onConfirmArchive={handleConfirmArchive}
        isArchiving={isArchiving}
      />

      {/* Meeting Comparison Modal */}
      <MeetingComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        meetings={meetings}
      />

      {/* Assign to Series Modal */}
      {assignSeriesMeeting && (
        <AssignSeriesModal
          isOpen={isAssignSeriesOpen}
          onClose={() => {
            setIsAssignSeriesOpen(false);
            setAssignSeriesMeeting(null);
          }}
          meetingTitle={assignSeriesMeeting.title}
          seriesList={seriesList}
          currentSeriesId={(assignSeriesMeeting as any).seriesId}
          onAssign={async (seriesId) => {
            await assignSeriesMutation.mutateAsync({ meetingId: assignSeriesMeeting.id, seriesId });
          }}
          onRemove={async () => {
            await removeSeriesMutation.mutateAsync(assignSeriesMeeting.id);
          }}
          isLoading={assignSeriesMutation.isPending || removeSeriesMutation.isPending}
        />
      )}
    </div>
  );
}
