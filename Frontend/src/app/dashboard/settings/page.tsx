"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, Bell, Shield, Palette, LockKeyholeIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingsHeader } from "@/components/dashboard/settings/SettingsHeader";
import { SettingsTabs, SettingsTabType } from "@/components/dashboard/settings/SettingsTabs";
import { AiTabContent, AppSettings } from "@/components/dashboard/settings/AiTabContent";
import { NotificationsTabContent } from "@/components/dashboard/settings/NotificationsTabContent";
import { SecurityTabContent, UserSession } from "@/components/dashboard/settings/SecurityTabContent";
import { ChangePassword } from "@/components/dashboard/settings/ChangePasswordTab";
import { AppearanceTabContent } from "@/components/dashboard/settings/AppearanceTabContent";

const DEFAULT_SETTINGS: AppSettings = {
  summaryLength: "Medium",
  template: "Standard",
  customPrompt: "Focus heavily on technical decisions, code deliverables, and explicit action item due dates.",
  autoExtractActionItems: true,
  emailNotifications: true,
  weeklyDigest: false,
  slackWebhookUrl: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTabType>("ai");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get("/settings/sessions");
      if (Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch (e) {
      console.error("Error fetching login sessions:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/settings");
      if (response.data) {
        setSettings({
          summaryLength: response.data.summaryLength || "Medium",
          template: response.data.template || "Standard",
          customPrompt: response.data.customPrompt || DEFAULT_SETTINGS.customPrompt,
          autoExtractActionItems: response.data.autoExtractActionItems ?? true,
          emailNotifications: response.data.emailNotifications ?? true,
          weeklyDigest: response.data.weeklyDigest ?? false,
          slackWebhookUrl: response.data.slackWebhookUrl || "",
        });
      }
    } catch (e) {
      console.error("Error loading user settings from API, fallback to defaults:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await api.put("/settings", settings);
      if (response.data) {
        setSavedSuccess(true);
        toast.success("Settings saved successfully!");
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save settings to API:", e);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      setIsSaving(true);
      await api.put("/settings", DEFAULT_SETTINGS);
      setSavedSuccess(true);
      toast.success("Settings reset to defaults");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to reset settings:", e);
      toast.error("Failed to reset settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-6 px-4">
        <div className="w-full space-y-8 max-w-4xl animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 w-20 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>

          {/* Navigation Tabs Skeleton */}
          <div className="hidden md:flex gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>

          {/* Form Content Skeleton */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48 rounded-md" />
                  <Skeleton className="h-4 w-72 rounded-md" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-56 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-6 px-4">
      <div className="w-full space-y-8 max-w-4xl">
        {/* Header */}
        <SettingsHeader
          handleReset={handleReset}
          handleSave={handleSave}
          isSaving={isSaving}
          savedSuccess={savedSuccess}
        />

        {/* Desktop Navigation Tabs (Hidden on Mobile) */}
        <div className="hidden md:block">
          <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Desktop Tab Content (Hidden on Mobile) */}
        <div className="hidden md:block">
          {activeTab === "ai" && <AiTabContent settings={settings} setSettings={setSettings} />}
          {activeTab === "notifications" && <NotificationsTabContent settings={settings} setSettings={setSettings} />}
          {activeTab === "security" && <SecurityTabContent sessions={sessions} />}
          {activeTab === "appearance" && <AppearanceTabContent />}
          {activeTab === "Change Password" && <ChangePassword />}
        </div>

        {/* Mobile Accordion / Collapsible Tabs (Hidden on Desktop) */}
        <div className="block md:hidden space-y-1">
          <MobileCollapsibleTab
            label="AI Prompts & Rules"
            icon={Sparkles}
            isOpen={activeTab === "ai"}
            onClick={() => setActiveTab(activeTab === "ai" ? ("" as any) : "ai")}
          >
            <AiTabContent settings={settings} setSettings={setSettings} />
          </MobileCollapsibleTab>

          <MobileCollapsibleTab
            label="Alerts & Webhooks"
            icon={Bell}
            isOpen={activeTab === "notifications"}
            onClick={() => setActiveTab(activeTab === "notifications" ? ("" as any) : "notifications")}
          >
            <NotificationsTabContent settings={settings} setSettings={setSettings} />
          </MobileCollapsibleTab>

          <MobileCollapsibleTab
            label="Security & Audit"
            icon={Shield}
            isOpen={activeTab === "security"}
            onClick={() => setActiveTab(activeTab === "security" ? ("" as any) : "security")}
          >
            <SecurityTabContent sessions={sessions} />
          </MobileCollapsibleTab>

          <MobileCollapsibleTab
            label="Appearance"
            icon={Palette}
            isOpen={activeTab === "appearance"}
            onClick={() => setActiveTab(activeTab === "appearance" ? ("" as any) : "appearance")}
          >
            <AppearanceTabContent />
          </MobileCollapsibleTab>

          <MobileCollapsibleTab
            label="Change Password"
            icon={LockKeyholeIcon}
            isOpen={activeTab === "Change Password"}
            onClick={() => setActiveTab(activeTab === "Change Password" ? ("" as any) : "Change Password")}
          >
            <ChangePassword />
          </MobileCollapsibleTab>
        </div>
      </div>
    </div>
  );
}

interface MobileCollapsibleTabProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function MobileCollapsibleTab({ label, icon: Icon, isOpen, onClick, children }: MobileCollapsibleTabProps) {
  return (
    <div className="border border-zinc-200/80 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4.5 h-4.5 text-indigo-500" />
          <span>{label}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4.5 h-4.5 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4.5 h-4.5 text-zinc-500" />
        )}
      </button>
      {isOpen && <div className="p-1 border-t border-zinc-100 bg-zinc-50/20">{children}</div>}
    </div>
  );
}
