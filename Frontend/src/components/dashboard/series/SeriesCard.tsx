"use client";

import { Calendar, Repeat2, Trash2, Edit2, Brain, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface SeriesCardProps {
  series: {
    id: string;
    title: string;
    description?: string | null;
    color: string;
    recurrenceLabel: string;
    meetingCount: number;
    lastMeetingDate?: string | null;
    createdAt: string;
  };
  onEdit: (series: any) => void;
  onDelete: (series: any) => void;
}

export function SeriesCard({ series, onEdit, onDelete }: SeriesCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
    >
      {/* Color accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: series.color || "#6366f1" }}
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="flex-1 min-w-0">
          {/* Series title + recurrence badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate">{series.title}</h3>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${series.color}20`, color: series.color }}
            >
              <Repeat2 className="w-3 h-3" />
              {series.recurrenceLabel}
            </span>
          </div>

          {/* Description */}
          {series.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{series.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              {series.meetingCount} meeting{series.meetingCount !== 1 ? "s" : ""}
            </span>
            {series.lastMeetingDate && (
              <span className="flex items-center gap-1">
                Last:{" "}
                {new Date(series.lastMeetingDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(series)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Edit series"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(series)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete series"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View detail link */}
      <div className="mt-4 pl-3 flex items-center justify-between">
        <Link
          href={`/dashboard/series/${series.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group/link"
        >
          View Timeline & Intelligence
          <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
          <Brain className="w-3 h-3" />
          AI Ready
        </span>
      </div>
    </motion.div>
  );
}
