import db from "../../db";
import { notifications } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";

export class NotificationsRepository {
  async createNotification(data: { userId: string; title: string; message: string; type?: string }) {
    await db.insert(notifications).values({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "general",
      isRead: false,
    });
  }

  async findByUserId(userId: string) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
  }

  async seedWelcomeNotifications(userId: string) {
    await db.insert(notifications).values([
      {
        userId,
        title: "Welcome to MeetNotes AI! 🎉",
        message: "Your AI transcript summarizer and Action Tracker are live.",
        type: "general",
        isRead: false,
      },
      {
        userId,
        title: "AI Prompt Engine Ready",
        message: "Custom AI prompt templates and sentiment analytics configured.",
        type: "ai_summary",
        isRead: false,
      },
    ]);
  }

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async clearAll(userId: string) {
    await db.delete(notifications).where(eq(notifications.userId, userId));
  }
}

export const notificationsRepository = new NotificationsRepository();
