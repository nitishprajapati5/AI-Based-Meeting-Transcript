"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useState } from "react";

interface CrossMeetingIntelligence {
  recurringThemes: string[];
  unresolvedBlockers: { issue: string; firstSeenOccurrence: number }[];
  actionItemCarryOver: { task: string; owner: string; openSinceOccurrence: number }[];
  sentimentTrend: { occurrence: number; title: string; score: number; tone: string }[];
  participantConsistency: { email: string; attendedCount: number; totalOccurrences: number }[];
  keyInsights: string[];
  recommendedFocusAreas: string[];
}

interface SeriesIntelligencePanelProps {
  intelligence: CrossMeetingIntelligence;
}

const toneColor = (tone: string) => {
  switch (tone) {
    case "Positive":
      return "#10b981";
    case "Neutral":
      return "#6366f1";
    case "Concerned":
      return "#f59e0b";
    case "Heated":
      return "#ef4444";
    default:
      return "#6366f1";
  }
};

function SectionCard({
  icon,
  title,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: `${accent || "#6366f1"}18`, color: accent || "#6366f1" }}
          >
            {icon}
          </span>
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SeriesIntelligencePanel({ intelligence }: SeriesIntelligencePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Key Insights */}
      <SectionCard icon={<Lightbulb className="w-4 h-4" />} title="Key Insights" accent="#6366f1">
        <ul className="space-y-2 mt-1">
          {intelligence.keyInsights.map((insight, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Sentiment Trend Chart */}
      {intelligence.sentimentTrend.length > 0 && (
        <SectionCard icon={<TrendingUp className="w-4 h-4" />} title="Sentiment Trend" accent="#10b981">
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intelligence.sentimentTrend} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="occurrence" tickFormatter={(v) => `#${v}`} tick={{ fontSize: 11, fill: "#71717a" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#71717a" }} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${value}/100 (${props.payload?.tone})`,
                    "Sentiment",
                  ]}
                  labelFormatter={(label) => `Meeting #${label}`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        key={payload.occurrence}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={toneColor(payload.tone)}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Positive", "Neutral", "Concerned", "Heated"].map((tone) => (
              <span key={tone} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toneColor(tone) }} />
                {tone}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Participant Consistency */}
      {intelligence.participantConsistency.length > 0 && (
        <SectionCard icon={<Users className="w-4 h-4" />} title="Participant Consistency" accent="#3b82f6">
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={intelligence.participantConsistency.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" domain={[0, "dataMax"]} tick={{ fontSize: 11, fill: "#71717a" }} />
                <YAxis
                  type="category"
                  dataKey="email"
                  width={110}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 14) + "…" : v)}
                />
                <Tooltip
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} / ${props.payload.totalOccurrences} meetings`,
                    "Attended",
                  ]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: "12px" }}
                />
                <Bar dataKey="attendedCount" radius={[0, 6, 6, 0]}>
                  {intelligence.participantConsistency.slice(0, 8).map((entry, index) => {
                    const pct = entry.attendedCount / Math.max(entry.totalOccurrences, 1);
                    const color = pct >= 0.8 ? "#10b981" : pct >= 0.5 ? "#6366f1" : "#f59e0b";
                    return <Cell key={index} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Recurring Themes */}
      {intelligence.recurringThemes.length > 0 && (
        <SectionCard icon={<RotateCcw className="w-4 h-4" />} title="Recurring Themes" accent="#8b5cf6">
          <div className="mt-2 flex flex-wrap gap-2">
            {intelligence.recurringThemes.map((theme, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-semibold border border-violet-200 dark:border-violet-800"
              >
                {theme}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Unresolved Blockers */}
      {intelligence.unresolvedBlockers.length > 0 && (
        <SectionCard icon={<AlertTriangle className="w-4 h-4" />} title="Unresolved Blockers" accent="#ef4444">
          <ul className="mt-2 space-y-2">
            {intelligence.unresolvedBlockers.map((blocker, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{blocker.issue}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">First seen in meeting #{blocker.firstSeenOccurrence}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Action Item Carry-over */}
      {intelligence.actionItemCarryOver.length > 0 && (
        <SectionCard icon={<RotateCcw className="w-4 h-4" />} title="Action Item Carry-over" accent="#f59e0b">
          <ul className="mt-2 space-y-2">
            {intelligence.actionItemCarryOver.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl"
              >
                <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.task}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Owner: <strong>{item.owner}</strong> · Open since meeting #{item.openSinceOccurrence}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Recommended Focus Areas */}
      {intelligence.recommendedFocusAreas.length > 0 && (
        <SectionCard icon={<Target className="w-4 h-4" />} title="Recommended Focus for Next Meeting" accent="#10b981">
          <ul className="mt-2 space-y-2">
            {intelligence.recommendedFocusAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {area}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </motion.div>
  );
}
