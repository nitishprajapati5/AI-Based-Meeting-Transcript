import { Response } from "express";
import { settingsService } from "./settings.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { ValidationError } from "../../utils/errors";
import { cache, cacheKeys, invalidateCache } from "../../utils/cache";
import { createNotificationLog } from "../notifications/notifications.controller";

export const getUserSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userEmail = req.user?.email;
  if (!userEmail) throw new ValidationError("User authentication required");

  const userId = await settingsService.resolveUserId(req.user?.userId || (req.user as any)?.id, userEmail);
  const settings = await cache.getOrComputeWithHeader(
    res,
    cacheKeys.settings(userId),
    async () => settingsService.getSettings(userId, userEmail),
    5 * 60 * 1000
  );

  res.json(settings);
});

export const updateUserSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userEmail = req.user?.email;
  if (!userEmail) throw new ValidationError("User authentication required");

  const userId = await settingsService.resolveUserId(req.user?.userId || (req.user as any)?.id, userEmail);
  const updated = await settingsService.updateSettings(userId, req.body);

  await invalidateCache.user(userId, userEmail);
  createNotificationLog({
    userId,
    title: "Preferences Saved",
    message: `Your AI summarization rules & settings were updated.`,
    type: "general",
  });

  res.json(updated);
});

export const getUserSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userEmail = req.user?.email;
  if (!userEmail) throw new ValidationError("User authentication required");

  const userId = await settingsService.resolveUserId(req.user?.userId || (req.user as any)?.id, userEmail);
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const ipAddress = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "";

  const sessions = await settingsService.getSessions(userId, { ipAddress, userAgent });
  res.json(sessions);
});
