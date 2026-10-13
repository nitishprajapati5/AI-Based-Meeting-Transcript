"use client";

import { useState } from "react";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callService } from "@/lib/serviceApi";
import { SERVICE_IDS } from "@/lib/serviceIds";
import { Repeat2, Brain, Loader2, ArrowLeft, ChevronRight, Sparkles, RefreshCw, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { SeriesTimeline, SeriesIntelligencePanel } from "@/components/dashboard/series";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);

  // Fetch series + meetings
  const { data, isLoading, error } = useQuery({
    queryKey: ["series", id],
    queryFn: async () => {
      const res = await callService({ serviceId: SERVICE_IDS.SERIES.GET, params: { id } });
      return res;
    },
    staleTime: 1000 * 60 * 2,
  });

  const series = data as any;
  const meetings: any[] = series?.meetings || [];

  // Fetch intelligence on demand
  const handleGenerateIntelligence = async () => {
    if (meetings.length < 2) {
      toast.warning("Add at least 2 meetings to this series to generate cross-meeting intelligence.");
      return;
    }
    setIsLoadingIntelligence(true);
    setShowIntelligence(true);
    try {
      const res = await callService({
        serviceId: SERVICE_IDS.SERIES.INTELLIGENCE,
        params: { id },
      });
      setIntelligence(res);
    } catch (err) {
      toast.error("Failed to generate intelligence. Please try again.");
      setShowIntelligence(false);
    } finally {
      setIsLoadingIntelligence(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading series...</span>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="font-bold text-zinc-900 dark:text-zinc-100">Series not found</p>
        <Link href="/dashboard/series" className="text-sm text-indigo-500 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Series
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/series" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          Series
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{series.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          {/* Color avatar */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: series.color || "#6366f1" }}
          >
            <Repeat2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{series.title}</h1>
            {series.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{series.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: `${series.color}20`, color: series.color }}
              >
                <Repeat2 className="w-3 h-3" /> {series.recurrenceLabel}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Intelligence CTA */}
        <button
          onClick={handleGenerateIntelligence}
          disabled={isLoadingIntelligence || meetings.length < 2}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          title={meetings.length < 2 ? "Add at least 2 meetings to generate intelligence" : "Generate AI intelligence"}
        >
          {isLoadingIntelligence ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : intelligence ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {intelligence ? "Refresh Intelligence" : "Generate Intelligence"}
        </button>
      </div>

      {/* Intelligence Panel */}
      <AnimatePresence>
        {showIntelligence && (
          <motion.div
            key="intelligence"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-500">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Cross-Meeting Intelligence</h2>
                  <p className="text-xs text-zinc-500">AI analysis across {meetings.length} meetings in this series</p>
                </div>
              </div>

              {isLoadingIntelligence ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-sm font-medium">Analyzing {meetings.length} meetings...</p>
                  <p className="text-xs">This may take 10-20 seconds</p>
                </div>
              ) : intelligence ? (
                <SeriesIntelligencePanel intelligence={intelligence} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          Meeting Timeline ({meetings.length})
        </h2>
        <SeriesTimeline meetings={meetings} />
      </div>

      {/* Help text if no meetings */}
      {meetings.length === 0 && (
        <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
          💡 Go to{" "}
          <Link href="/dashboard/meetings" className="text-indigo-500 hover:underline font-semibold">
            Meetings
          </Link>{" "}
          and use the <strong>Assign to Series</strong> option on any meeting's action menu to add it here.
        </div>
      )}
    </div>
  );
}
