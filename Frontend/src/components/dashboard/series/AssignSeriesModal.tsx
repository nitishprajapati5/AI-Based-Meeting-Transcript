"use client";

import { useState } from "react";
import { X, Repeat2, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Series {
  id: string;
  title: string;
  color: string;
  recurrenceLabel: string;
  meetingCount: number;
}

interface AssignSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle: string;
  seriesList: Series[];
  currentSeriesId?: string | null;
  onAssign: (seriesId: string) => Promise<void>;
  onRemove: () => Promise<void>;
  isLoading?: boolean;
}

export function AssignSeriesModal({
  isOpen,
  onClose,
  meetingTitle,
  seriesList,
  currentSeriesId,
  onAssign,
  onRemove,
  isLoading,
}: AssignSeriesModalProps) {
  const [selected, setSelected] = useState<string | null>(currentSeriesId || null);

  const handleConfirm = async () => {
    if (selected && selected !== currentSeriesId) {
      await onAssign(selected);
    } else if (!selected && currentSeriesId) {
      await onRemove();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
                    <Repeat2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Assign to Series</h2>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[180px]" title={meetingTitle}>
                      {meetingTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Series list */}
              <div className="p-5 space-y-2 max-h-64 overflow-y-auto">
                {/* None option */}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm border transition-all cursor-pointer ${
                    selected === null
                      ? "border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-900 font-semibold"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                  <span className="text-zinc-500 dark:text-zinc-400">No series (remove from series)</span>
                </button>

                {seriesList.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">
                    No series created yet. Create one from the Series page.
                  </p>
                ) : (
                  seriesList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm border transition-all cursor-pointer ${
                        selected === s.id
                          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 font-semibold"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: s.color || "#6366f1" }}
                      />
                      <span className="flex-1 text-left truncate text-zinc-900 dark:text-zinc-100">{s.title}</span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {s.recurrenceLabel} · {s.meetingCount} mtg
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || selected === currentSeriesId}
                  className="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
