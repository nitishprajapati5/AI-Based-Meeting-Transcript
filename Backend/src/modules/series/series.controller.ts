import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { NotFoundError, ValidationError, InternalServerError, AuthorizationError } from "../../utils/errors";
import { seriesService } from "./series.service";
import { seriesRepository } from "./series.repository";
import { logger } from "../../utils/logger";

/** POST /service → series.create */
export const createSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, description, color, recurrenceLabel } = req.body as any;
  const userId = req.user?.userId;

  if (!userId) throw new ValidationError("User ID is required");
  if (!title || title.trim().length < 2) throw new ValidationError("Series title must be at least 2 characters");

  try {
    const series = await seriesService.createSeries({ userId, title, description, color, recurrenceLabel });
    res.status(201).json(series);
  } catch (error) {
    logger.error("Error creating series", error as Error, { userId });
    throw new InternalServerError("Failed to create series");
  }
});

/** GET /service → series.list */
export const listSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("User ID is required");

  try {
    const series = await seriesService.listSeries(userId);
    res.json(series);
  } catch (error) {
    logger.error("Error listing series", error as Error, { userId });
    throw new InternalServerError("Failed to list series");
  }
});

/** GET /service → series.get  (param: id) */
export const getSeriesById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const seriesId = String(req.params.id);
  const userId = req.user?.userId;

  try {
    const data = await seriesService.getSeriesWithMeetings(seriesId);
    if (!data) throw new NotFoundError("Series");

    if (data.userId !== userId) throw new AuthorizationError("You do not own this series");

    res.json(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    logger.error("Error fetching series", error as Error, { seriesId });
    throw new InternalServerError("Failed to fetch series");
  }
});

/** PATCH /service → series.update  (param: id) */
export const updateSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const seriesId = String(req.params.id);
  const userId = req.user?.userId;
  const { title, description, color, recurrenceLabel } = req.body as any;

  try {
    const existing = await seriesRepository.findById(seriesId);
    if (!existing) throw new NotFoundError("Series");
    if (existing.userId !== userId) throw new AuthorizationError("You do not own this series");

    const updated = await seriesService.updateSeries(seriesId, { title, description, color, recurrenceLabel });
    res.json(updated);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    logger.error("Error updating series", error as Error, { seriesId });
    throw new InternalServerError("Failed to update series");
  }
});

/** DELETE /service → series.delete  (param: id) */
export const deleteSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const seriesId = String(req.params.id);
  const userId = req.user?.userId;

  try {
    const existing = await seriesRepository.findById(seriesId);
    if (!existing) throw new NotFoundError("Series");
    if (existing.userId !== userId) throw new AuthorizationError("You do not own this series");

    await seriesService.deleteSeries(seriesId);
    res.json({ message: "Series deleted successfully" });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    logger.error("Error deleting series", error as Error, { seriesId });
    throw new InternalServerError("Failed to delete series");
  }
});

/** POST /service → series.assignMeeting */
export const assignMeetingToSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { meetingId, seriesId, occurrence } = req.body as any;

  if (!meetingId || !seriesId) throw new ValidationError("meetingId and seriesId are required");

  try {
    const series = await seriesRepository.findById(seriesId);
    if (!series) throw new NotFoundError("Series");

    const updated = await seriesService.assignMeetingToSeries(meetingId, seriesId, occurrence);
    if (!updated) throw new NotFoundError("Meeting");

    res.json({ message: "Meeting assigned to series successfully", meeting: updated });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    logger.error("Error assigning meeting to series", error as Error, { meetingId, seriesId });
    throw new InternalServerError("Failed to assign meeting to series");
  }
});

/** POST /service → series.removeMeeting */
export const removeMeetingFromSeries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { meetingId } = req.body as any;
  if (!meetingId) throw new ValidationError("meetingId is required");

  try {
    const updated = await seriesService.removeMeetingFromSeries(meetingId);
    if (!updated) throw new NotFoundError("Meeting");

    res.json({ message: "Meeting removed from series successfully", meeting: updated });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    logger.error("Error removing meeting from series", error as Error, { meetingId });
    throw new InternalServerError("Failed to remove meeting from series");
  }
});

/** GET /service → series.intelligence  (param: id) */
export const getSeriesIntelligence = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const seriesId = String(req.params.id);
  const userId = req.user?.userId;
  const limit = Number(req.query.limit) || 10;

  try {
    const existing = await seriesRepository.findById(seriesId);
    if (!existing) throw new NotFoundError("Series");
    if (existing.userId !== userId) throw new AuthorizationError("You do not own this series");

    const intelligence = await seriesService.getSeriesIntelligence(seriesId, limit);
    if (!intelligence) {
      res.status(404).json({ message: "No meetings with transcripts found in this series to analyze" });
      return;
    }

    res.json(intelligence);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    logger.error("Error generating series intelligence", error as Error, { seriesId });
    throw new InternalServerError("Failed to generate cross-meeting intelligence");
  }
});
