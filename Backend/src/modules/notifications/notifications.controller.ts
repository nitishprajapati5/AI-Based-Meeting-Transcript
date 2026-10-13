import { Response } from "express";
import { notificationsRepository } from "./notifications.repository";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";

export async function createNotificationLog({
  userId,
  title,
  message,
  type = "general",
}: {
  userId: string;
  title: string;
  message: string;
  type?: "ai_summary" | "overdue_task" | "security_access" | "general";
}) {
  if (!userId) return;
  try {
    await notificationsRepository.createNotification({ userId, title, message, type });
  } catch (err) {
    logger.error("Failed to create notification log", err as Error);
  }
}

export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;

  if (!userId) {
    res.json({ notifications: [], unreadCount: 0 });
    return;
  }

  let logs = await notificationsRepository.findByUserId(userId);
  if (logs.length === 0) {
    await notificationsRepository.seedWelcomeNotifications(userId);
    logs = await notificationsRepository.findByUserId(userId);
  }

  const unreadCount = logs.filter((n) => !n.isRead).length;
  res.json({ notifications: logs, unreadCount });
});

export const markAllNotificationsRead = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId || (req.user as any)?.id;
    if (userId) {
      await notificationsRepository.markAllAsRead(userId);
    }
    res.json({ message: "All notifications marked as read" });
  }
);

export const clearNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;
  if (userId) {
    await notificationsRepository.clearAll(userId);
  }
  res.json({ message: "Notifications cleared" });
});
