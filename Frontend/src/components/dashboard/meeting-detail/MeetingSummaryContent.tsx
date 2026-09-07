"use client";

import { MeetingSummary } from "@/types/meeting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SentimentSpeakerAnalytics } from "../meetings/SentimentSpeakerAnalytics";
import { Sparkles, Target, MessageSquare, CheckCircle2, Gavel, CheckSquare, User, Loader2 } from "lucide-react";

interface MeetingSummaryContentProps {
  summaryData: MeetingSummary | null | undefined;
  isGenerating: boolean;
  onGenerateSummary: () => void;
}

function stripHtml(htmlStr?: string): string {
  if (!htmlStr) return "";
  let currentHtml = htmlStr;
  let previousHtml;
  do {
    previousHtml = currentHtml;
    currentHtml = currentHtml.replace(/<[^>]*>?/gm, "");
  } while (currentHtml !== previousHtml);
  return currentHtml.trim();
}

export function MeetingSummaryContent({ summaryData, isGenerating, onGenerateSummary }: MeetingSummaryContentProps) {
  if (!summaryData) {
    return (
      <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
        <Sparkles className="mx-auto h-10 w-10 text-amber-400 mb-2" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No AI Summary generated yet</p>
        <p className="text-xs text-zinc-500 mb-4">
          Click below to generate structured meeting notes covering purpose, discussion, outcomes, concerns & next
          steps.
        </p>
        <Button
          size="sm"
          onClick={onGenerateSummary}
          disabled={isGenerating}
          className="flex items-center gap-2 mx-auto"
        >
          {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
          Generate AI Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template Style Badge Indicator */}
      {summaryData.templateStyle && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-medium paper-sheet">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-muted-foreground">AI Prompt Template Style:</span>
          </div>
          <Badge
            variant="secondary"
            className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold"
          >
            {summaryData.templateStyle}
          </Badge>
        </div>
      )}

      {/* Sentiment & Speaker Analytics Visual Widget */}
      <SentimentSpeakerAnalytics sentiment={summaryData.sentimentAnalysis} speakers={summaryData.speakerAnalytics} />

      {/* Executive Strategic Briefing */}
      {summaryData.executiveDetails && (
        <div className="paper-card p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 space-y-3 shadow-sm">
          <h5 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Executive Strategic Briefing
          </h5>
          <div className="space-y-2 text-xs text-foreground">
            <div>
              <span className="font-semibold text-purple-700 dark:text-purple-300">Strategic Impact: </span>
              <span className="text-muted-foreground">{stripHtml(summaryData.executiveDetails.strategicImpact)}</span>
            </div>
            {summaryData.executiveDetails.financialOrTimelineRisks?.length > 0 && (
              <div>
                <span className="font-semibold text-purple-700 dark:text-purple-300">Financial / Timeline Risks:</span>
                <ul className="list-disc list-inside pl-2 space-y-0.5 mt-1 text-muted-foreground">
                  {summaryData.executiveDetails.financialOrTimelineRisks.map((r, i) => (
                    <li key={i}>{stripHtml(r)}</li>
                  ))}
                </ul>
              </div>
            )}
            {summaryData.executiveDetails.executiveRecommendations?.length > 0 && (
              <div>
                <span className="font-semibold text-purple-700 dark:text-purple-300">Recommendations:</span>
                <ul className="list-disc list-inside pl-2 space-y-0.5 mt-1 text-muted-foreground">
                  {summaryData.executiveDetails.executiveRecommendations.map((rec, i) => (
                    <li key={i}>{stripHtml(rec)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purpose & Overview (Memo Pad Style) */}
      {summaryData.purpose && (
        <div className="memo-note memo-amber rounded-xl border space-y-1.5">
          <h5 className="text-xs font-semibold flex items-center gap-1.5">
            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Purpose & Overview
          </h5>
          <p className="text-xs sm:text-sm leading-relaxed font-sans opacity-90">{stripHtml(summaryData.purpose)}</p>
        </div>
      )}

      {/* Discussion Points (Ruled Notebook Section) */}
      {summaryData.discussionPoints && summaryData.discussionPoints.length > 0 && (
        <div className="paper-card p-4 rounded-xl border border-border space-y-2.5">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-blue-500" /> Main Discussion Points
          </h5>
          <ul className="space-y-2 pl-1 text-xs sm:text-sm text-muted-foreground font-sans">
            {summaryData.discussionPoints.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 pb-1 border-b border-border/40 last:border-0 last:pb-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{stripHtml(point)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Major Outcomes */}
      {summaryData.majorOutcomes && summaryData.majorOutcomes.length > 0 && (
        <div className="paper-card p-4 rounded-xl border border-border space-y-2.5">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Major Outcomes
          </h5>
          <ul className="space-y-2 pl-1 text-xs sm:text-sm text-muted-foreground font-sans">
            {summaryData.majorOutcomes.map((outcome, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 pb-1 border-b border-border/40 last:border-0 last:pb-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{stripHtml(outcome)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Decisions */}
      {summaryData.keyDecisions && summaryData.keyDecisions.length > 0 && (
        <div className="paper-card p-4 rounded-xl border border-border space-y-2.5">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Gavel className="h-4 w-4 text-indigo-500" /> Key Decisions
          </h5>
          <ul className="space-y-2.5 pl-1 text-xs sm:text-sm text-muted-foreground font-sans">
            {summaryData.keyDecisions.map((kd, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 pb-2 border-b border-border/40 last:border-0 last:pb-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{stripHtml(kd.decision)}</span>
                    {kd.category && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono tracking-wider text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0 rounded-md"
                      >
                        {kd.category}
                      </Badge>
                    )}
                  </div>
                  {kd.context && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{stripHtml(kd.context)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Action Items */}
      {summaryData.actionItems && summaryData.actionItems.length > 0 && (
        <div className="paper-card p-4 rounded-xl border border-border space-y-2.5">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-purple-500" /> Extracted Action Items
          </h5>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground font-sans">
            {summaryData.actionItems.map((item, index) => (
              <li
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg paper-sheet border border-border hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                  <span className="font-medium text-foreground">{stripHtml(item.task)}</span>
                </div>
                <div className="flex items-center gap-2.5 pl-4 sm:pl-0 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <User className="h-3.5 w-3.5" /> {item.owner || "Unassigned"}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md"
                  >
                    Due: {item.dueDate || "N/A"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
