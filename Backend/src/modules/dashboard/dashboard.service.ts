import db from "../../db";
import { meetings, actionItems } from "../../db/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";

export class DashboardService {
  async computeDashboardStats(currentUserEmail: string, userId?: string) {
    const userMeetings = await db
      .select()
      .from(meetings)
      .where(
        and(
          sql`${meetings.participants} @> ${JSON.stringify([currentUserEmail])}::jsonb`,
          eq(meetings.isArchived, false),
          eq(meetings.isDeleted, false)
        )
      );

    const userMeetingIds = userMeetings.map((m) => m.id);
    const actionConditions = [eq(actionItems.isArchived, false)];
    const accessConditions = [sql`LOWER(${actionItems.owner}) = ${currentUserEmail}`];

    if (userId) {
      accessConditions.push(eq(actionItems.userId, userId));
    }
    if (userMeetingIds.length > 0) {
      accessConditions.push(inArray(actionItems.meetingId, userMeetingIds));
    }

    actionConditions.push(or(...accessConditions)!);

    const userActionItems = await db
      .select()
      .from(actionItems)
      .where(and(...actionConditions));

    const today = new Date().toISOString().split("T")[0];
    const totalMeetings = userMeetings.length;
    const totalActionItems = userActionItems.length;

    const openActionItems = userActionItems.filter((item) => {
      const s = item.status?.toLowerCase() || "";
      return s === "open" || s === "pending" || s === "in progress" || s === "in_progress";
    }).length;

    const completedActionItems = userActionItems.filter((item) => item.status?.toLowerCase() === "completed").length;
    const overdueActionItems = userActionItems.filter((item) => {
      if (!item.dueDate || item.dueDate === "Not specified" || item.status?.toLowerCase() === "completed") {
        return false;
      }
      return item.dueDate < today;
    }).length;
    const blockedActionItems = userActionItems.filter((item) => item.status?.toLowerCase() === "blocked").length;
    const savedTranscripts = userMeetings.filter((m) => m.transcript && m.transcript.trim().length > 0).length;

    const recentMeetings = [...userMeetings]
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 4);

    const timelineMap: Record<string, { date: string; meetingsCount: number; transcriptsCount: number }> = {};
    const sortedMeetings = [...userMeetings].sort(
      (a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );

    sortedMeetings.forEach((m) => {
      const d = m.createdAt ? new Date(m.createdAt) : new Date(m.date);
      const dateKey = isNaN(d.getTime()) ? m.date : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { date: dateKey, meetingsCount: 0, transcriptsCount: 0 };
      }
      timelineMap[dateKey].meetingsCount += 1;
      if (m.transcript && m.transcript.trim().length > 0) {
        timelineMap[dateKey].transcriptsCount += 1;
      }
    });

    const meetingsTimeline = Object.values(timelineMap);
    const statusCounts: Record<string, number> = { Open: 0, "In Progress": 0, Completed: 0, Blocked: 0, Pending: 0 };
    userActionItems.forEach((item) => {
      const st = item.status || "Pending";
      const matchedKey = Object.keys(statusCounts).find((k) => k.toLowerCase() === st.toLowerCase()) || "Open";
      statusCounts[matchedKey] = (statusCounts[matchedKey] || 0) + 1;
    });

    const actionItemsStatusDistribution = Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const priorityCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
    userActionItems.forEach((item) => {
      const pr = item.priority || "Medium";
      const matchedKey = Object.keys(priorityCounts).find((k) => k.toLowerCase() === pr.toLowerCase()) || "Medium";
      priorityCounts[matchedKey] = (priorityCounts[matchedKey] || 0) + 1;
    });

    const actionItemsPriorityDistribution = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
    const decisionCategoriesMap: Record<string, number> = {};
    userMeetings.forEach((m) => {
      if (m.summary && Array.isArray(m.summary.keyDecisions)) {
        m.summary.keyDecisions.forEach((kd) => {
          const cat = kd.category || "General Decision";
          decisionCategoriesMap[cat] = (decisionCategoriesMap[cat] || 0) + 1;
        });
      }
    });

    const keyDecisionsBreakdown = Object.entries(decisionCategoriesMap).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      metrics: {
        totalMeetings,
        totalActionItems,
        openActionItems,
        completedActionItems,
        overdueActionItems,
        blockedActionItems,
        savedTranscripts,
      },
      recentMeetings,
      charts: {
        meetingsTimeline,
        actionItemsStatusDistribution,
        actionItemsPriorityDistribution,
        keyDecisionsBreakdown,
      },
    };
  }
}

export const dashboardService = new DashboardService();
