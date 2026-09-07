"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  CheckSquare,
  Loader2,
  Menu,
  X,
  Settings,
  Keyboard,
  Archive,
  Bell,
  Trash2,
  Check,
  RefreshCw,
  Delete,
  CheckCircle2,
  MessageSquare,
  Repeat2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { NotificationItem } from "./NotificationDropdown";
import { AppearanceDropdown } from "./AppearanceDropdown";
import pkg from "../../../package.json";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { label: "Action Tracker", href: "/dashboard/action-items", icon: CheckSquare },
  { label: "Series", href: "/dashboard/series", icon: Repeat2 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Archive", href: "/dashboard/archive", icon: Archive },
  { label: "Trash", href: "/dashboard/trash", icon: Delete },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  // Notification States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/notifications");
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
  }, []);

  // Poll notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsLoggingOut(false);
      toast.info("Logged out successfully");
      router.push("/login");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Marked all notifications as read");
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
      setUnreadCount(0);
      toast.info("Cleared all notifications");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Group notifications date-wise
  const groupNotificationsByDate = (items: NotificationItem[]) => {
    const groups: { [key: string]: NotificationItem[] } = {};
    items.forEach((item) => {
      const date = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = "Older";
      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      } else {
        key = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  const userName = user?.name || "Nitish Prajapati";
  const userEmail = user?.email || "nitish@zignuts.com";
  const userInitials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "NP";

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-6 overflow-hidden dark:bg-zinc-950">
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 stroke-current"
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base leading-none tracking-tight text-zinc-900">
                Syncra
              </h2>
              <span className="text-[11px] font-medium text-zinc-500">AI Assistant</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-shortcuts-dialog"))}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link key={item.label} href={item.href} className="relative block">
                <div
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}

          {/* Notifications Nav Item */}
          <button onClick={() => setIsNotificationsOpen(true)} className="w-full relative block text-left">
            <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="h-4.5 w-4.5" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      <div className="pt-4 border-t border-zinc-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-zinc-200">
            <AvatarImage src="" />
            <AvatarFallback className="bg-zinc-900 text-white text-xs font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs overflow-hidden">
            <p className="font-semibold dark:text-zinc-100 truncate max-w-27.5">{userName}</p>
            <p className="text-zinc-500 truncate max-w-27.5" title={userEmail}>
              {userEmail}
            </p>
            <p
              className="text-[10px] font-semibold text-zinc-400 mt-0.5"
              title={`Frontend Version: v${pkg.version}`}
            >
              v{pkg.version}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
          title="Logout"
        >
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-base text-zinc-900">Syncra</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-chatbot"))}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="AI Co-Pilot Chatbot"
          >
            <MessageSquare className="h-4 w-4 text-indigo-500" />
          </button>
          <AppearanceDropdown />
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Notifications Center"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-shortcuts-dialog"))}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-200 bg-white flex-col shrink-0 h-screen sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Slide-over Notifications Drawer Panel */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setIsNotificationsOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-55 w-full max-w-md bg-white border-l border-zinc-200 shadow-xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900">Notifications</h3>
                    {unreadCount > 0 ? (
                      <p className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                        {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-400 mt-0.5">All caught up</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Feed Actions */}
              {notifications.length > 0 && (
                <div className="px-6 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs font-semibold">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Read All
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                </div>
              )}

              {/* List Scroll Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoading && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
                    <span className="text-xs font-medium">Loading notifications...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-zinc-300" />
                    <div>
                      <p className="text-sm font-bold text-zinc-800">No notifications</p>
                      <p className="text-xs text-zinc-400 mt-1">You have no alerts at this time.</p>
                    </div>
                  </div>
                ) : (
                  Object.entries(groupedNotifications).map(([dateKey, items]) => (
                    <div key={dateKey} className="space-y-3">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 pl-1">
                        {dateKey}
                      </h4>
                      <div className="space-y-2.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition-all ${item.isRead
                              ? "bg-white border-zinc-200 opacity-70"
                              : "bg-zinc-50 border-zinc-300 font-semibold"
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 mt-0.5">
                                <Bell className="h-4 w-4" />
                              </div>
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-zinc-900 truncate">
                                    {item.title}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 shrink-0 font-medium">
                                    {new Date(item.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                                  {item.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
