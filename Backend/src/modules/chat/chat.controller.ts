import { Response } from "express";
import { chatService } from "./chat.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { ValidationError, NotFoundError, InternalServerError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export const queryGlobalChatMemory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;
  const userEmail = req.user?.email;

  if (!userId || !userEmail) {
    throw new ValidationError("User authentication context is required");
  }

  const { question, sessionId, meetingId } = req.body as { question: string; sessionId?: string; meetingId?: string };
  if (!question || question.trim().length === 0) {
    throw new ValidationError("Question cannot be empty");
  }

  try {
    const result = await chatService.queryMemory({ userId, userEmail, question, sessionId, meetingId });
    res.json(result);
  } catch (error) {
    logger.error("Error in queryGlobalChatMemory", error as Error, { userId });
    throw error instanceof Error ? error : new InternalServerError("Failed to query global memory chatbot");
  }
});

export const getChatSessionsList = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;
  if (!userId) {
    throw new ValidationError("User authentication required");
  }

  try {
    const sessions = await chatService.getSessions(userId);
    res.json({ sessions });
  } catch (error) {
    logger.error("Error fetching chat sessions", error as Error, { userId });
    throw new InternalServerError("Failed to fetch chat sessions");
  }
});

export const getChatSessionMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;
  const sessionId = String(req.params.id || req.query.sessionId);

  if (!userId || !sessionId) {
    throw new ValidationError("Session ID is required");
  }

  try {
    const data = await chatService.getSessionMessages(userId, sessionId);
    if (!data) {
      throw new NotFoundError("Chat session");
    }
    res.json(data);
  } catch (error) {
    logger.error("Error fetching session messages", error as Error, { sessionId });
    throw error instanceof Error ? error : new InternalServerError("Failed to fetch chat session messages");
  }
});

export const triggerUserMemorySync = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || (req.user as any)?.id;
  const userEmail = req.user?.email;

  if (!userId || !userEmail) {
    throw new ValidationError("User authentication required");
  }

  try {
    const result = await chatService.syncUserMemories(userId, userEmail);
    res.json({
      message: "Long-term memory sync completed successfully",
      stats: result,
    });
  } catch (error) {
    logger.error("Error triggering user memory sync", error as Error, { userId });
    throw new InternalServerError("Failed to perform memory synchronization");
  }
});
