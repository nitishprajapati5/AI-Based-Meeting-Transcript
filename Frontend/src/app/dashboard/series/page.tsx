"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callService } from "@/lib/serviceApi";
import { SERVICE_IDS } from "@/lib/serviceIds";
import { Repeat2, Plus, Loader2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { SeriesCard, CreateSeriesModal } from "@/components/dashboard/series";

export default function SeriesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<any | null>(null);

  // Fetch all series
  const { data: seriesList = [], isLoading } = useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const res = await callService({ serviceId: SERVICE_IDS.SERIES.LIST });
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Create series mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return callService({ serviceId: SERVICE_IDS.SERIES.CREATE, payload: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series created successfully!");
      setIsCreateOpen(false);
      setEditingSeries(null);
    },
    onError: () => toast.error("Failed to create series"),
  });

  // Update series mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return callService({ serviceId: SERVICE_IDS.SERIES.UPDATE, params: { id }, payload: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series updated successfully!");
      setIsCreateOpen(false);
      setEditingSeries(null);
    },
    onError: () => toast.error("Failed to update series"),
  });

  // Delete series mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return callService({ serviceId: SERVICE_IDS.SERIES.DELETE, params: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series deleted. Meetings are still intact.");
    },
    onError: () => toast.error("Failed to delete series"),
  });

  const handleSave = async (data: any) => {
    if (editingSeries?.id) {
      await updateMutation.mutateAsync({ id: editingSeries.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8 mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
              <Repeat2 className="w-5 h-5" />
            </div>
            Meeting Series
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Group related recurring meetings and unlock cross-meeting AI intelligence.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSeries(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-sm font-bold rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          New Series
        </button>
      </div>

      {/* Stats banner */}
      {seriesList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Total Series",
              value: seriesList.length,
              icon: <Repeat2 className="w-4 h-4" />,
              color: "#6366f1",
            },
            {
              label: "Total Meetings",
              value: seriesList.reduce((sum: number, s: any) => sum + (s.meetingCount || 0), 0),
              icon: <BarChart3 className="w-4 h-4" />,
              color: "#10b981",
            },
            {
              label: "Avg. per Series",
              value:
                seriesList.length > 0
                  ? Math.round(
                      seriesList.reduce((sum: number, s: any) => sum + (s.meetingCount || 0), 0) / seriesList.length
                    )
                  : 0,
              icon: <BarChart3 className="w-4 h-4" />,
              color: "#f59e0b",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-xs"
            >
              <span
                className="p-2 rounded-xl"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </span>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading series...</span>
        </div>
      ) : seriesList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center gap-4"
        >
          <div className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700">
            <Repeat2 className="w-10 h-10" />
          </div>
          <div>
            <p className="font-bold text-zinc-900 dark:text-zinc-100">No meeting series yet</p>
            <p className="text-sm text-zinc-500 mt-1">
              Create your first series to group recurring meetings and unlock AI trend analysis.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Series
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {seriesList.map((series: any) => (
            <SeriesCard
              key={series.id}
              series={series}
              onEdit={(s) => {
                setEditingSeries(s);
                setIsCreateOpen(true);
              }}
              onDelete={(s) => {
                if (confirm(`Delete series "${s.title}"? Your meetings will not be deleted.`)) {
                  deleteMutation.mutate(s.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CreateSeriesModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingSeries(null);
        }}
        onSave={handleSave}
        initialData={editingSeries}
        isSaving={isSaving}
      />
    </div>
  );
}
