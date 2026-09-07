"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare, Clock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetrics } from "./types";

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function DashboardMetricsGrid({ metrics, isLoading }: DashboardMetricsGridProps) {
  const metricItems = [
    {
      title: "Total Meetings",
      value: metrics.totalMeetings,
      subtitle: "Scheduled & recorded",
      icon: Calendar,
    },
    {
      title: "Total Action Items",
      value: metrics.totalActionItems,
      subtitle: "Across all meetings",
      icon: CheckSquare,
    },
    {
      title: "Open Action Items",
      value: metrics.openActionItems,
      subtitle: "Pending resolution",
      icon: Clock,
    },
    {
      title: "Completed Items",
      value: metrics.completedActionItems,
      subtitle: "Resolved tasks",
      icon: CheckCircle2,
    },
    {
      title: "Overdue Items",
      value: metrics.overdueActionItems,
      subtitle: "Requires immediate action",
      icon: AlertTriangle,
    },
    {
      title: "Blocked Action Items",
      value: metrics.blockedActionItems,
      subtitle: "Roadblocks or dependencies",
      icon: AlertCircle,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4"
    >
      {metricItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.div key={idx} variants={cardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
            <Card className="paper-card rounded-xl border border-border shadow-xs transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-muted text-foreground border border-border">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 rounded-md my-1" />
                ) : (
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">{item.value}</div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{item.subtitle}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
