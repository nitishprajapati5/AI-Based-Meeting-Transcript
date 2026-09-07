"use client";

import { useState } from "react";
import { X, Repeat2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const RECURRENCE_LABELS = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Ad-hoc"];

interface CreateSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    color: string;
    recurrenceLabel: string;
  }) => Promise<void>;
  initialData?: {
    id?: string;
    title?: string;
    description?: string | null;
    color?: string;
    recurrenceLabel?: string;
  } | null;
  isSaving?: boolean;
}

export function CreateSeriesModal({ isOpen, onClose, onSave, initialData, isSaving }: CreateSeriesModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#6366f1");
  const [recurrenceLabel, setRecurrenceLabel] = useState(initialData?.recurrenceLabel || "Weekly");

  // Reset when modal opens with new initialData
  const isEditing = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({ title: title.trim(), description: description.trim() || undefined, color, recurrenceLabel });
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
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
                    <Repeat2 className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                    {isEditing ? "Edit Series" : "Create Meeting Series"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Series Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Weekly Engineering Standup"
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Description <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this recurring meeting series about?"
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
                  />
                </div>

                {/* Recurrence */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Recurrence
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {RECURRENCE_LABELS.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setRecurrenceLabel(label)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                          recurrenceLabel === label
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 hover:text-indigo-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                          color === c ? "ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-950 scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="px-4 py-3 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: color, backgroundColor: `${color}10`, color }}
                >
                  {title || "Series Preview"} · {recurrenceLabel}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !title.trim()}
                    className="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isEditing ? "Save Changes" : "Create Series"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
