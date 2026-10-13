"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Meeting, MeetingSummary, SummaryTemplate } from "@/types/meeting";
import { exportMeetingToMarkdown } from "@/lib/exportUtils";
import { exportMeetingToHTMLReport, exportMeetingToPDF } from "@/lib/reportExportUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, FileText, FileCode, Printer, Sparkles, Loader2, Bot } from "lucide-react";

import { MeetingShareableSection } from "./meeting-detail/MeetingShareableSection";
import { MeetingSummaryContent } from "./meeting-detail/MeetingSummaryContent";
import { MeetingChatTab, ChatMessage } from "./meeting-detail/MeetingChatTab";

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (meeting: Meeting) => void;
  isSummarizing?: boolean;
  hideShareableSection?: boolean;
}

export function MeetingDetailModal({
  meeting,
  isOpen,
  onClose,
  onEdit,
  isSummarizing = false,
  hideShareableSection = false,
}: MeetingDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "transcript" | "chat">("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLanguage] = useState<string>("English");
  const [selectedTemplate, setSelectedTemplate] = useState<SummaryTemplate>("Standard");
  const [currentSummary, setCurrentSummary] = useState<MeetingSummary | null | undefined>(meeting?.summary);

  // RAG Chat State
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Hi! I'm your RAG AI Assistant for this meeting. Ask me anything about project decisions, technical blockers, task owners, or deadline dates!",
    },
  ]);

  // Share state
  const [isPublished, setIsPublished] = useState<boolean>(!!meeting?.isMeetingPublished);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Security & Expiration settings
  const [sharePasswordInput, setSharePasswordInput] = useState<string>("");
  const [hasSharePassword, setHasSharePassword] = useState<boolean>(!!meeting?.hasPassword);
  const [expirationHours, setExpirationHours] = useState<string>("never");
  const [shareExpiresAtDate, setShareExpiresAtDate] = useState<string | null>(meeting?.shareExpiresAt || null);

  // Sync state when meeting prop changes
  useEffect(() => {
    setCurrentSummary(meeting?.summary);
    const published = !!meeting?.isMeetingPublished;
    setIsPublished(published);
    setShareToken(null);
    setActiveTab("summary");
    setHasSharePassword(!!meeting?.hasPassword);
    setShareExpiresAtDate(meeting?.shareExpiresAt || null);
    setSharePasswordInput("");
    setExpirationHours("never");
    setChatInput("");
    setChatMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content:
          "Hi! I'm your RAG AI Assistant for this meeting. Ask me anything about project decisions, technical blockers, task owners, or deadline dates!",
      },
    ]);

    if (published && meeting?.id) {
      setIsPublishing(true);
      api
        .patch(`/meetings/${meeting.id}/publish`, { isMeetingPublished: true })
        .then((res) => {
          if (res.data?.shareToken) {
            setShareToken(res.data.shareToken);
          }
          if (res.data?.hasPassword !== undefined) setHasSharePassword(res.data.hasPassword);
          if (res.data?.shareExpiresAt !== undefined) setShareExpiresAtDate(res.data.shareExpiresAt);
        })
        .catch((err) => console.error("Failed to fetch share token on modal open:", err))
        .finally(() => setIsPublishing(false));
    }
  }, [meeting]);

  const handleSendChatMessage = async (promptText?: string) => {
    const query = promptText || chatInput;
    if (!query.trim() || !meeting || isChatSending) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = { id: userMsgId, role: "user" as const, content: query.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!promptText) setChatInput("");
    setIsChatSending(true);

    try {
      const history = chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post(`/meetings/${meeting.id}/chat`, {
        question: query.trim(),
        history,
      });

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant" as const,
        content: res.data.answer || "I could not find information regarding that in this meeting.",
        sources: res.data.retrievedSources || [],
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("RAG Chat request error:", err);
      toast.error("Failed to query RAG AI. Please check server connection.");
    } finally {
      setIsChatSending(false);
    }
  };

  const handleUpdateShareSettings = async (overridePublished?: boolean) => {
    if (!meeting) return;
    try {
      setIsPublishing(true);
      const targetPublished = overridePublished !== undefined ? overridePublished : isPublished;

      const payload: any = { isMeetingPublished: targetPublished };
      if (sharePasswordInput.trim()) payload.sharePassword = sharePasswordInput.trim();
      if (expirationHours !== "never") payload.expirationHours = parseInt(expirationHours, 10);

      const res = await api.patch(`/meetings/${meeting.id}/publish`, payload);

      const updatedStatus = res.data.isMeetingPublished;
      setIsPublished(updatedStatus);
      meeting.isMeetingPublished = updatedStatus;
      setHasSharePassword(res.data.hasPassword);
      setShareExpiresAtDate(res.data.shareExpiresAt);
      meeting.hasPassword = res.data.hasPassword;

      if (res.data.shareToken) {
        setShareToken(res.data.shareToken);
      }

      toast.success("Public share security settings updated");
      setSharePasswordInput("");
    } catch (err) {
      console.error("Failed to update share settings:", err);
      toast.error("Failed to update share settings");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClearPassword = async () => {
    if (!meeting) return;
    try {
      await api.patch(`/meetings/${meeting.id}/publish`, {
        isMeetingPublished: true,
        clearPassword: true,
      });
      setHasSharePassword(false);
      meeting.hasPassword = false;
      toast.success("Password lock removed");
    } catch (err) {
      console.error("Failed to clear share password:", err);
    }
  };

  const handleClearExpiration = async () => {
    if (!meeting) return;
    try {
      await api.patch(`/meetings/${meeting.id}/publish`, {
        isMeetingPublished: true,
        clearExpiration: true,
      });
      setShareExpiresAtDate(null);
      meeting.shareExpiresAt = null;
      setExpirationHours("never");
      toast.success("Link expiration cleared");
    } catch (err) {
      console.error("Failed to clear expiration:", err);
    }
  };

  const handleTogglePublish = async (newPublishedStatus: boolean) => {
    if (!meeting) return;
    try {
      setIsPublishing(true);
      if (newPublishedStatus) {
        await handleUpdateShareSettings(true);
      } else {
        const res = await api.patch(`/meetings/${meeting.id}/publish`, {
          isMeetingPublished: false,
        });
        setIsPublished(false);
        meeting.isMeetingPublished = false;
        setShareToken(null);
        toast.info("Public share link revoked");
      }
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateSummary = async () => {
    if (!meeting) return;
    try {
      setIsGenerating(true);
      const res = await api.post(`/meetings/${meeting.id}/summarize`, {
        language: selectedLanguage,
        template: selectedTemplate,
      });
      if (res.data && res.data.summary) {
        setCurrentSummary(res.data.summary);
        meeting.summary = res.data.summary;
        toast.success("AI summary generated!");
      }
    } catch (err) {
      console.error("Failed to generate AI summary:", err);
      toast.error("Failed to generate AI summary");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!meeting) return null;

  const summaryData = currentSummary || meeting.summary;
  const participantList = Array.isArray(meeting.participants)
    ? meeting.participants
    : typeof meeting.participants === "string"
      ? (meeting.participants as string).split(",").map((p) => p.trim())
      : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-5xl sm:max-w-5xl md:max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-6">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200"
                >
                  {meeting.type || "General"}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(meeting.date).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                </div>
              </div>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{meeting.title}</DialogTitle>
            </div>

            {/* Header Export & Edit Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportMeetingToMarkdown(meeting);
                  toast.success("Markdown summary exported!");
                }}
                className="h-8 text-xs gap-1 border-zinc-200 dark:border-zinc-800"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" /> Export MD
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportMeetingToHTMLReport(meeting);
                  toast.success("HTML Executive Report exported!");
                }}
                className="h-8 text-xs gap-1 border-zinc-200 dark:border-zinc-800"
              >
                <FileCode className="h-3.5 w-3.5 text-emerald-500" /> Export HTML
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportMeetingToPDF(meeting);
                  toast.info("Opening PDF print preview...");
                }}
                className="h-8 text-xs gap-1 border-zinc-200 dark:border-zinc-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-500" /> Save as PDF
              </Button>
            </div>
          </div>

          {/* Participant Chips */}
          {participantList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Attendees:
              </span>
              {participantList.map((p, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[11px] font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Shareable Link Controls */}
          {!hideShareableSection && (
            <MeetingShareableSection
              isPublished={isPublished}
              shareToken={shareToken}
              isPublishing={isPublishing}
              copied={copied}
              hasSharePassword={hasSharePassword}
              sharePasswordInput={sharePasswordInput}
              setSharePasswordInput={setSharePasswordInput}
              expirationHours={expirationHours}
              setExpirationHours={setExpirationHours}
              shareExpiresAtDate={shareExpiresAtDate}
              onTogglePublish={handleTogglePublish}
              onCopyLink={handleCopyLink}
              onUpdateSettings={handleUpdateShareSettings}
              onClearPassword={handleClearPassword}
              onClearExpiration={handleClearExpiration}
            />
          )}

          {/* Structured Summary, Transcript & RAG Chat Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "summary" | "transcript" | "chat")}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <TabsList className={`grid w-full sm:w-[380px] ${meeting.hasChunks ? "grid-cols-3" : "grid-cols-2"}`}>
                <TabsTrigger value="summary" className="flex items-center justify-center gap-1.5 text-xs">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI Summary
                </TabsTrigger>
                <TabsTrigger value="transcript" className="flex items-center justify-center gap-1.5 text-xs">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Transcript
                </TabsTrigger>
                {meeting.hasChunks && (
                  <TabsTrigger value="chat" className="flex items-center justify-center gap-1.5 text-xs">
                    <Bot className="h-4 w-4 text-indigo-500" />
                    Ask AI Chat
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                <Select
                  value={selectedTemplate}
                  onValueChange={(val) => val && setSelectedTemplate(val as SummaryTemplate)}
                >
                  <SelectTrigger className="h-8 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 w-36 font-medium">
                    <SelectValue placeholder="Select Style" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="Standard">Standard Briefing</SelectItem>
                    <SelectItem value="Executive">Executive Summary</SelectItem>
                    <SelectItem value="Developer">Developer Tasks</SelectItem>
                    <SelectItem value="Technical">Technical Decisions</SelectItem>
                    <SelectItem value="Sales">Sales Qualification</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateSummary}
                  disabled={isGenerating || isPublished}
                  className={`h-8 text-xs gap-1.5 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 ${
                    isPublished ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  )}
                  {isGenerating ? "Generating..." : "Re-generate AI Notes"}
                </Button>
              </div>
            </div>

            {/* AI Structured Summary View */}
            <TabsContent value="summary" className="mt-3">
              <MeetingSummaryContent
                summaryData={summaryData}
                isGenerating={isGenerating}
                onGenerateSummary={handleGenerateSummary}
              />
            </TabsContent>

            {/* Transcript & Rich Text Notes View */}
            <TabsContent value="transcript" className="mt-3">
              <div className="notebook-ruled paper-sheet p-6 rounded-xl border border-border text-sm min-h-[180px] leading-[28px] prose dark:prose-invert max-w-none shadow-sm">
                {meeting.transcript ? (
                  meeting.transcript.includes("<") && meeting.transcript.includes(">") ? (
                    <div dangerouslySetInnerHTML={{ __html: meeting.transcript }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{meeting.transcript}</div>
                  )
                ) : (
                  <span className="text-muted-foreground italic">No transcript available for this meeting.</span>
                )}
              </div>
            </TabsContent>

            {/* RAG-Powered Ask AI Chat View */}
            <TabsContent value="chat" className="mt-3">
              <MeetingChatTab
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatSending={isChatSending}
                onSendChatMessage={handleSendChatMessage}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              onEdit(meeting);
            }}
          >
            Edit Meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
