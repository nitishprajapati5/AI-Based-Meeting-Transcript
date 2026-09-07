"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Globe,
  Laptop,
  Smartphone,
  Clock,
  Activity,
  Layers,
  RefreshCw,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import api from "@/lib/axios";
import { AuditHealthMetrics, AuditHealthStats } from "./AuditHealthMetrics";
import { AuditLogsTable } from "./AuditLogsTable";

export interface UserSession {
  id: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

interface SecurityTabContentProps {
  sessions: UserSession[];
}

export function SecurityTabContent({ sessions }: SecurityTabContentProps) {
  const [stats, setStats] = useState<AuditHealthStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<"all" | "health" | "logs" | "sessions">("all");

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.get("/audit/stats");
      if (res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch audit stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl mx-auto space-y-6 p-2 sm:p-4"
    >
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Shield className="w-5 h-5" />
              </span>
              Security & Audit Logs Dashboard
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              Monitor system health, API response latencies, security audit logs, and active user login sessions in real
              time.
            </p>
          </div>

          {/* Quick Sub-Section Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100/80 rounded-2xl border border-zinc-200/60 self-start sm:self-center">
            <button
              onClick={() => setActiveSubSection("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubSection === "all"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveSubSection("health")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubSection === "health"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              API Health
            </button>
            <button
              onClick={() => setActiveSubSection("logs")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubSection === "logs"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveSubSection("sessions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubSection === "sessions"
                  ? "bg-white dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Sessions
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: API Health & Telemetry Metrics */}
      {(activeSubSection === "all" || activeSubSection === "health") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              API Health & Telemetry
            </h4>
            <button
              onClick={fetchStats}
              disabled={isLoadingStats}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingStats ? "animate-spin text-indigo-500" : ""}`} />
              <span>Refresh Stats</span>
            </button>
          </div>

          <AuditHealthMetrics stats={stats} isLoading={isLoadingStats} onRefresh={fetchStats} />
        </div>
      )}

      {/* SECTION 2: Request & Audit Logs Table */}
      {(activeSubSection === "all" || activeSubSection === "logs") && (
        <div className="space-y-3 pt-2">
          <AuditLogsTable onRefreshStats={fetchStats} />
        </div>
      )}

      {/* SECTION 3: Active Devices & Login Sessions */}
      {(activeSubSection === "all" || activeSubSection === "sessions") && (
        <div className="dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
                  <Laptop className="w-5 h-5" />
                </span>
                Active Devices & Login Sessions
              </h3>
              <p className="text-xs text-zinc-500">Current authenticated browser sessions and IP access history.</p>
            </div>
            <span className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1 rounded-full font-semibold border border-zinc-200">
              {sessions.length} Active Session{sessions.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    sess.isCurrent ? "bg-zinc-50/90 border-zinc-300 shadow-xs" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl dark:bg-zinc-900 border border-zinc-200 text-zinc-900 mt-0.5">
                      {sess.device === "Mobile" ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900">
                          {sess.os} • {sess.browser}
                        </span>
                        {sess.isCurrent && (
                          <span className="text-[10px] bg-zinc-900 text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Globe className="w-3 h-3 text-zinc-400" />
                          IP: {sess.ipAddress}
                        </span>
                        <span>•</span>
                        <span>{sess.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 self-start sm:self-center font-medium">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {sess.lastActive
                        ? new Date(sess.lastActive).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Active Now"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
                No logged session records found.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
