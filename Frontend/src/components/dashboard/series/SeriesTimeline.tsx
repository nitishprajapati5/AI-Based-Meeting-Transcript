"use client";

import { motion } from "framer-motion";
import { Calendar, Users, FileText, CheckSquare, Tag, Pin } from "lucide-react";

interface TimelineMeeting {
  id: string;
  title: string;
  date: string;
  type: string;
  participants: string[];
  seriesOccurrence?: number | null;
  summary?: any | null;
  transcript?: string | null;
  isPinned?: boolean;
}

interface SeriesTimelineProps {
  meetings: TimelineMeeting[];
}

const typeColors: Record<string, string> = {
  meeting: "#6366f1",
  standup: "#10b981",
  review: "#f59e0b",
  planning: "#3b82f6",
  retrospective: "#ec4899",
  demo: "#8b5cf6",
};

export function SeriesTimeline({ meetings }: SeriesTimelineProps) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 dark:text-zinc-500 gap-3">
        <Calendar className="w-10 h-10 opacity-40" />
        <p className="font-semibold text-sm">No meetings in this series yet</p>
        <p className="text-xs">Assign existing meetings to this series from the Meetings page.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="space-y-6">
        {meetings.map((meeting, idx) => {
          const color = typeColors[meeting.type] || "#6366f1";
          const occurrence = meeting.seriesOccurrence ?? idx + 1;
          const sentimentScore = meeting.summary?.sentimentAnalysis?.score;
          const actionItemCount = meeting.summary?.actionItems?.length ?? 0;

          return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-5 items-start"
            >
              {/* Occurrence dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white font-bold text-xs shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  #{occurrence}
                </div>
              </div>

              {/* Card */}
              <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{meeting.title}</h4>
                      {meeting.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(meeting.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {meeting.type}
                      </span>
                    </div>
                  </div>

                  {/* Sentiment badge */}
                  {sentimentScore !== undefined && (
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        sentimentScore >= 75
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                          : sentimentScore >= 50
                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {sentimentScore}/100
                    </div>
                  )}
                </div>

                {/* Summary snippet */}
                {meeting.summary?.purpose && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {meeting.summary.purpose}
                  </p>
                )}

                {/* Footer stats */}
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                  {meeting.transcript && meeting.transcript.trim().length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <FileText className="w-3 h-3" /> Transcript
                    </span>
                  )}
                  {actionItemCount > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> {actionItemCount} action item{actionItemCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {!meeting.summary && !meeting.transcript && (
                    <span className="text-zinc-300 dark:text-zinc-700 italic">No summary yet</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
