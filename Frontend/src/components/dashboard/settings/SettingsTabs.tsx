"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Bell, Shield, LockKeyholeIcon, Palette } from "lucide-react";

export type SettingsTabType = "ai" | "notifications" | "security" | "appearance" | "Change Password";

interface SettingsTabsProps {
  activeTab: SettingsTabType;
  setActiveTab: (tab: SettingsTabType) => void;
}

const tabs: { id: SettingsTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "ai", label: "AI Prompts & Rules", icon: Sparkles },
  { id: "notifications", label: "Alerts & Webhooks", icon: Bell },
  { id: "security", label: "Security & Audit", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "Change Password", label: "Change Password", icon: LockKeyholeIcon },
];


export function SettingsTabs({ activeTab, setActiveTab }: SettingsTabsProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none pb-1 flex justify-start md:justify-center">
      <div className="inline-flex min-w-max p-1.5 rounded-2xl bg-zinc-100/90 backdrop-blur-md gap-1 relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer z-10 ${isActive
                ? "text-brand font-bold"
                : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}

            >
              {isActive && (
                <motion.div
                  layoutId="activeSettingsTabPill"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm border border-zinc-200/60"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
