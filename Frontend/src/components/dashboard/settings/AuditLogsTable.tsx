"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Radio,
  FileCode,
  ShieldAlert,
  Calendar,
  Layers,
  X,
  Copy,
  Check,
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface RequestLogItem {
  id: number;
  method: string;
  path: string;
  status: number;
  duration: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  serviceId: string | null;
  createdAt: string;
}

interface AuditLogsTableProps {
  onRefreshStats?: () => void;
}

export function AuditLogsTable({ onRefreshStats }: AuditLogsTableProps) {
  const [logs, setLogs] = useState<RequestLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusGroup, setStatusGroup] = useState<"all" | "2xx" | "3xx" | "4xx" | "5xx" | "errors">("all");
  const [method, setMethod] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RequestLogItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch logs
  const fetchLogs = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const res = await api.get("/audit/logs", {
        params: {
          page,
          limit: 15,
          statusGroup,
          method: method !== "ALL" ? method : undefined,
          search: debouncedSearch || undefined,
        },
      });

      if (res.data) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalLogs(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      if (!isBackground) {
        toast.error("Failed to fetch audit logs");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusGroup, method, debouncedSearch]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
      if (onRefreshStats) onRefreshStats();
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, page, statusGroup, method, debouncedSearch]);

  const handleManualRefresh = () => {
    fetchLogs();
    if (onRefreshStats) onRefreshStats();
    toast.success("Audit logs refreshed");
  };

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info("Log details copied to clipboard");
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          {status} OK
        </span>
      );
    }
    if (status >= 300 && status < 400) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border dark:border-sky-800/80 font-mono">
          {status}
        </span>
      );
    }
    if (status >= 400 && status < 500) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
          {status} Client Err
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
        {status} Server Err
      </span>
    );
  };

  const getMethodBadge = (m: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      POST: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      PUT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      PATCH: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      DELETE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    };
    return (
      <span
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${colors[m] || "bg-zinc-100 text-zinc-700 border-zinc-200"
          }`}
      >
        {m}
      </span>
    );
  };

  const formatDuration = (d: string | null) => {
    if (!d) return "-";
    const num = parseFloat(d.replace("ms", ""));
    let colorClass = "text-emerald-600 dark:text-emerald-400";
    if (num > 1200) colorClass = "text-rose-600 dark:text-rose-400 font-semibold";
    else if (num > 600) colorClass = "text-amber-600 dark:text-amber-400";
    return <span className={`font-mono text-xs ${colorClass}`}>{d}</span>;
  };

  return (
    <div className="dark:bg-zinc-950 rounded-3xl p-5 sm:p-7 border border-zinc-200 shadow-xs space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-500" />
            Audit & Request Logs Explorer
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time asynchronous telemetry recorded from API invocations and security events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${autoRefresh
              ? "bg-emerald-50 text-emerald-700 dark:border-emerald-800"
              : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? "animate-pulse text-emerald-500" : "text-zinc-400"}`} />
            <span>Auto Refresh</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by endpoint, serviceId, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Group Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: "all", label: "All" },
              { id: "2xx", label: "2xx OK" },
              { id: "errors", label: "Errors" },
              { id: "4xx", label: "4xx" },
              { id: "5xx", label: "5xx" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setStatusGroup(filter.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${statusGroup === filter.id
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Method Dropdown */}
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by HTTP method"
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-4">Service & Endpoint</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Loading request audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-zinc-400" />
                      <span className="font-semibold text-zinc-600">No logs found</span>
                      <span className="text-[11px] text-zinc-400">Try adjusting your filters or search term</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                    <td className="py-3 px-3">{getMethodBadge(log.method)}</td>
                    <td className="py-3 px-4 max-w-70">
                      {log.serviceId ? (

                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-zinc-900 block truncate text-[11px]">
                            {log.serviceId}
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate block">{log.path}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-zinc-800 truncate block text-[11px]">
                          {log.path}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">{formatDuration(log.duration)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                      {log.ipAddress === "::1" ? "127.0.0.1" : log.ipAddress || "-"}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      <div title={new Date(log.createdAt).toLocaleString()}>
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                        <span className="text-[10px] text-zinc-400 block">
                          {new Date(log.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="View Full Log"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/50 border-t border-zinc-200 text-xs text-zinc-500">
          <div>
            Showing <span className="font-bold text-zinc-900">{logs.length}</span> of{" "}
            <span className="font-bold text-zinc-900">{totalLogs}</span> total logs
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-zinc-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-indigo-500" />
                  <span>Request Log Details</span>
                </div>
                <div>{getStatusBadge(selectedLog.status)}</div>
              </DialogTitle>
              <DialogDescription>
                Detailed request telemetry captured on {new Date(selectedLog.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Key metadata grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl dark:bg-zinc-900/60 border border-zinc-200">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Method & Endpoint</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getMethodBadge(selectedLog.method)}
                    <span className="font-mono font-bold text-zinc-800 truncate">
                      {selectedLog.path}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Service ID</span>
                  <span className="font-mono text-indigo-600 font-bold block mt-0.5 truncate">
                    {selectedLog.serviceId || "None (Direct REST)"}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Execution Latency</span>
                  <div className="mt-0.5">{formatDuration(selectedLog.duration)}</div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Client IP</span>
                  <span className="font-mono text-zinc-700 block mt-0.5">
                    {selectedLog.ipAddress || "127.0.0.1"}
                  </span>
                </div>
              </div>

              {/* User Agent */}
              <div>
                <span className="text-zinc-500 font-semibold block mb-1">User Agent</span>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-[11px] text-zinc-700 break-all leading-relaxed">
                  {selectedLog.userAgent || "Unknown User Agent"}
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-500 font-semibold">Raw Audit Payload</span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-48 border border-zinc-800">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
