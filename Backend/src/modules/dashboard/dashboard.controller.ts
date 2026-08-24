import { Response } from "express";
import { dashboardService } from "./dashboard.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";
import { ValidationError, InternalServerError } from "../../utils/errors";
import { cache, cacheKeys } from "../../utils/cache";

export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const currentUserEmail = req.user?.email?.toLowerCase();
  const userId = req.user?.userId;

  if (!currentUserEmail) {
    throw new ValidationError("User email is required");
  }

  try {
    const payload = await cache.getOrComputeWithHeader(
      res,
      cacheKeys.dashboard(currentUserEmail),
      async () => dashboardService.computeDashboardStats(currentUserEmail, userId),
      60 * 1000
    );

    res.json(payload);
  } catch (error) {
    logger.error("Error fetching dashboard stats", error as Error, { userEmail: currentUserEmail });
    throw new InternalServerError("Failed to fetch dashboard statistics");
  }
});
