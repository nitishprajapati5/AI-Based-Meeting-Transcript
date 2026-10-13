import { Request, Response } from "express";
import { actionItemsRepository } from "./action-items.repository";
import { actionItemsService } from "./action-items.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";
import { NotFoundError, ValidationError, InternalServerError, AuthorizationError } from "../../utils/errors";
import { getPaginationOffset, calculatePagination, buildPaginatedResponse } from "../../utils/queryOptimization";
import { ActionItemQueryInput, CreateActionItemInput, UpdateActionItemInput } from "../../utils/validation";
import { createNotificationLog } from "../notifications/notifications.controller";
import db from "../../db";
import { meetings } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getActionItems = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { meetingId, status, priority, page = 1, limit = 10 } = req.query as any;
  const currentUserEmail = req.user?.email?.toLowerCase();
  const userId = req.user?.userId;

  if (!currentUserEmail) {
    throw new ValidationError("User email is required");
  }

  try {
    const numLimit = Number(limit) || 10;
    const numPage = Number(page) || 1;
    const offset = getPaginationOffset(numPage, numLimit);

    const { items, total } = await actionItemsRepository.findPaginated({
      currentUserEmail,
      userId,
      meetingId,
      status,
      priority,
      page: numPage,
      limit: numLimit,
      offset,
    });

    const pagination = calculatePagination(numPage, numLimit, total);
    res.json(buildPaginatedResponse(items, pagination));
  } catch (error) {
    logger.error("Error fetching action items", error as Error, { userEmail: currentUserEmail });
    throw new InternalServerError("Failed to fetch action items");
  }
});

export const getActionItemsByMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const meetingId = String(req.params.meetingId);

  try {
    const meeting = await db.select().from(meetings).where(eq(meetings.id, meetingId));
    if (meeting.length === 0) {
      throw new NotFoundError("Meeting");
    }

    const userEmail = req.user?.email?.toLowerCase();
    if (
      !Array.isArray(meeting[0].participants) ||
      !meeting[0].participants.some((p: string) => p.toLowerCase() === userEmail)
    ) {
      throw new AuthorizationError("You are not a participant in this meeting");
    }

    const items = await actionItemsRepository.findByMeetingId(meetingId);
    res.json(items);
  } catch (error) {
    logger.error("Error fetching action items for meeting", error as Error, { meetingId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to fetch action items for meeting");
  }
});

export const getActionItemById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const userEmail = req.user?.email?.toLowerCase();

  try {
    const actionItem = await actionItemsRepository.findById(targetId);
    if (!actionItem) {
      throw new NotFoundError("Action item");
    }

    const meeting = await db.select().from(meetings).where(eq(meetings.id, actionItem.meetingId));
    if (meeting.length === 0) {
      throw new NotFoundError("Associated meeting");
    }

    const isMeetingParticipant =
      Array.isArray(meeting[0].participants) &&
      meeting[0].participants.some((p: string) => p.toLowerCase() === userEmail);
    const isAssigned = actionItem.owner?.toLowerCase() === userEmail;

    if (!isMeetingParticipant && !isAssigned) {
      throw new AuthorizationError("You do not have access to this action item");
    }

    res.json(actionItem);
  } catch (error) {
    logger.error("Error fetching action item", error as Error, { itemId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to fetch action item");
  }
});

export const getActionItemsLeaderboard = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const allItems = await actionItemsRepository.findAllUnarchived();
      const map = new Map<string, { total: number; completed: number; inProgress: number; blocked: number }>();

      allItems.forEach((item) => {
        const ownerName = item.owner || "Unassigned";
        if (!map.has(ownerName)) {
          map.set(ownerName, { total: 0, completed: 0, inProgress: 0, blocked: 0 });
        }
        const stats = map.get(ownerName)!;
        stats.total += 1;
        if (item.status === "Completed") stats.completed += 1;
        else if (item.status === "In Progress") stats.inProgress += 1;
        else if (item.status === "Blocked") stats.blocked += 1;
      });

      const leaderboard = Array.from(map.entries()).map(([owner, stats]) => {
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        let badgeTitle = "Task Contributor";
        let badgeColor = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200";

        if (completionRate >= 75 && stats.completed > 0) {
          badgeTitle = "Execution Champion 🏆";
          badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300";
        } else if (completionRate >= 40 || stats.completed >= 2) {
          badgeTitle = "Sprint Star ⚡";
          badgeColor = "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300";
        } else if (stats.inProgress > 0) {
          badgeTitle = "Task Ninja 🥷";
          badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300";
        }

        return {
          owner,
          totalTasks: stats.total,
          completedTasks: stats.completed,
          inProgressTasks: stats.inProgress,
          blockedTasks: stats.blocked,
          completionRate,
          badgeTitle,
          badgeColor,
        };
      });

      leaderboard.sort((a, b) => b.completionRate - a.completionRate || b.completedTasks - a.completedTasks);
      res.json(leaderboard);
    } catch (error) {
      logger.error("Error fetching leaderboard stats", error as Error);
      throw error instanceof (Error as any) ? error : new InternalServerError("Failed to fetch leaderboard stats");
    }
  }
);

export const createActionItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { task, owner, dueDate, priority, status, meetingId } = req.body as CreateActionItemInput;
  const userEmail = req.user?.email;

  try {
    const meetingResult = await db.select().from(meetings).where(eq(meetings.id, meetingId));
    if (meetingResult.length === 0) {
      throw new NotFoundError("Associated meeting");
    }

    const created = await actionItemsService.createItem({
      task,
      owner,
      dueDate,
      priority,
      status,
      meetingId,
      userEmail,
    });

    createNotificationLog({
      userId: req.user?.userId || (req.user as any)?.id,
      title: "Action Item Created",
      message: `Task "${task}" assigned to ${owner || "Unassigned"}.`,
      type: "general",
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error("Error creating action item", error as Error, { meetingId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to create action item");
  }
});

export const updateActionItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const { task, owner, dueDate, priority, status } = req.body as UpdateActionItemInput;
  const userEmail = req.user?.email;

  try {
    const updated = await actionItemsService.updateItem(
      targetId,
      { task, owner, dueDate, priority, status },
      userEmail
    );
    if (!updated) {
      throw new NotFoundError("Action item");
    }

    createNotificationLog({
      userId: req.user?.userId || (req.user as any)?.id,
      title: status ? `Task Status: ${status}` : "Task Updated",
      message: `Task "${updated.task}" was updated.`,
      type: status === "Completed" ? "general" : "overdue_task",
    });

    res.json(updated);
  } catch (error) {
    logger.error("Error updating action item", error as Error, { itemId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to update action item");
  }
});

export const deleteActionItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const userEmail = req.user?.email;

  try {
    const deleted = await actionItemsService.deleteItem(targetId, userEmail);
    if (!deleted) {
      throw new NotFoundError("Action item");
    }

    createNotificationLog({
      userId: req.user?.userId || (req.user as any)?.id,
      title: "Action Item Deleted",
      message: `Task "${deleted.task}" was permanently removed.`,
      type: "general",
    });

    res.json({
      message: "Action item deleted successfully",
      actionItem: deleted,
    });
  } catch (error) {
    logger.error("Error deleting action item", error as Error, { itemId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to delete action item");
  }
});
