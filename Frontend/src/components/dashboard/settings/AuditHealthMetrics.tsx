"use client";

import React from "react";
import { Activity, CheckCircle2, AlertTriangle, Clock, Zap, Server, ShieldCheck, ArrowUpRight } from "lucide-react";

export interface AuditHealthStats {
  health: {
    status: "Operational" | "Degraded" | "Critical";
    totalRequests: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    errorRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  };
  statusBreakdown: {
    success2xx: number;
    redirect3xx: number;
    clientError4xx: number;
    serverError5xx: number;
  };
  topServices: {
    serviceId: string;
    count: number;
  }[];
  recentErrors: Array<{
    id: number;
    method: string;
    path: string;
    status: number;
    duration: string | null;
    serviceId: string | null;
    createdAt: string;
  }>;
}

interface AuditHealthMetricsProps {
  stats: AuditHealthStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AuditHealthMetrics({ stats, isLoading, onRefresh }: AuditHealthMetricsProps) {
  if (!stats) return null;

  const { health, statusBreakdown, topServices } = stats;
  const total = health.totalRequests || 1;

  // Breakdown percentages
  const p2xx = Math.round((statusBreakdown.success2xx / total) * 100);
  const p3xx = Math.round((statusBreakdown.redirect3xx / total) * 100);
  const p4xx = Math.round((statusBreakdown.clientError4xx / total) * 100);
  const p5xx = Math.max(0, 100 - p2xx - p3xx - p4xx);

  const isHealthy = health.status === "Operational";
  const isDegraded = health.status === "Degraded";

  return (
    <div className="space-y-5">
      {/* Top Health Header & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: System Status */}
        <div className="p-4.5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">System Health</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isHealthy
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isDegraded
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isHealthy ? "bg-emerald-500 animate-pulse" : isDegraded ? "bg-amber-500" : "bg-rose-500 animate-ping"
                }`}
              />
              {health.status}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{health.successRate}%</span>
              <span className="text-xs text-zinc-500 font-medium">success rate</span>
            </div>
            <div className="mt-2 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHealthy ? "bg-emerald-500" : isDegraded ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, health.successRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total API Requests */}
        <div className="p-4.5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Invocations</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black dark:text-zinc-100">{health.totalRequests.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 font-semibold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                {health.successCount.toLocaleString()}
              </span>
              <span>passed</span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg Response Time */}
        <div className="p-4.5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Average Latency</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900">{health.avgLatencyMs} ms</div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>p95 Latency:</span>
              <span className="font-semibold text-zinc-700">{health.p95LatencyMs} ms</span>
            </div>
          </div>
        </div>

        {/* Card 4: Error Rate */}
        <div className="p-4.5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Errors</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900">{health.errorCount.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <span className={`font-semibold ${health.errorRate > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {health.errorRate}%
              </span>
              <span>of all requests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic & Status Distribution Bar + Top Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution Bar */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-zinc-500" />
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">HTTP Status Distribution</h4>
            </div>
            <span className="text-[11px] text-zinc-400">{health.totalRequests} sampled requests</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${p2xx}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`2xx Success: ${statusBreakdown.success2xx}`}
            />
            <div
              style={{ width: `${p3xx}%` }}
              className="bg-sky-400 h-full transition-all duration-300"
              title={`3xx Redirect: ${statusBreakdown.redirect3xx}`}
            />
            <div
              style={{ width: `${p4xx}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`4xx Client Error: ${statusBreakdown.clientError4xx}`}
            />
            <div
              style={{ width: `${p5xx}%` }}
              className="bg-rose-500 h-full transition-all duration-300"
              title={`5xx Server Error: ${statusBreakdown.serverError5xx}`}
            />
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">2xx Success</div>
                <div className="font-bold text-zinc-900">{statusBreakdown.success2xx}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">3xx Redirect</div>
                <div className="font-bold text-zinc-900">{statusBreakdown.redirect3xx}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">4xx Client Error</div>
                <div className="font-bold text-zinc-900">{statusBreakdown.clientError4xx}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">5xx Server Error</div>
                <div className="font-bold text-zinc-900">{statusBreakdown.serverError5xx}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Services List */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Top Services</h4>
            </div>
            <span className="text-[11px] text-zinc-400">by volume</span>
          </div>

          <div className="space-y-2">
            {topServices.length > 0 ? (
              topServices.map((svc) => (
                <div
                  key={svc.serviceId}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                >
                  <span className="font-mono text-[11px] text-zinc-800 truncate max-w-42.5">{svc.serviceId}</span>

                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                    {svc.count} calls
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-zinc-400">No service traffic recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
