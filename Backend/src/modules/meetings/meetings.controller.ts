import { Request, Response } from "express";
import { meetingsRepository } from "./meetings.repository";
import { meetingsService } from "./meetings.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";
import { NotFoundError, ValidationError, InternalServerError, AuthorizationError } from "../../utils/errors";
import { getPaginationOffset, calculatePagination, buildPaginatedResponse } from "../../utils/queryOptimization";
import { jobQueue } from "../../services/jobQueue";
import { queryMeetingRAG } from "../../services/aiService";
import { deleteUserMemoryBySource } from "../../services/langchain/vectorStore";

export const getMeetings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { search, type, page = 1, limit = 10, isArchived, isDeleted } = req.query as any;
  const userEmail = req.user?.email?.toLowerCase();

  if (!userEmail) {
    throw new ValidationError("User email is required");
  }

  try {
    const numLimit = Number(limit) || 10;
    const numPage = Number(page) || 1;
    const offset = getPaginationOffset(numPage, numLimit);

    const { items, total } = await meetingsRepository.findPaginated(userEmail, {
      search,
      type,
      page: numPage,
      limit: numLimit,
      offset,
      isArchived: isArchived === true || isArchived === "true",
      isDeleted: isDeleted === true || isDeleted === "true",
    });

    const pagination = calculatePagination(numPage, numLimit, total);
    res.json(buildPaginatedResponse(items, pagination));
  } catch (error) {
    logger.error("Error fetching meetings", error as Error, { userEmail });
    throw new InternalServerError("Failed to fetch meetings");
  }
});

export const getMeetingById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const userEmail = req.user?.email?.toLowerCase();

  try {
    const meeting = await meetingsRepository.findById(targetId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    if (
      !Array.isArray(meeting.participants) ||
      !meeting.participants.some((p: string) => p.toLowerCase() === userEmail)
    ) {
      throw new AuthorizationError("You are not a participant in this meeting");
    }

    res.json(meeting);
  } catch (error) {
    logger.error("Error fetching meeting", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to fetch meeting");
  }
});

export const createMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, date, participants, transcript, type, language, summaryLength, template, customPrompt } =
    req.body as any;
  const userEmail = req.user?.email;

  if (!userEmail) {
    throw new ValidationError("User email is required");
  }

  try {
    const { meeting, jobId } = await meetingsService.createMeetingWithJob({
      title,
      date,
      participants,
      transcript,
      type,
      language,
      summaryLength,
      template,
      customPrompt,
      userEmail,
    });

    res.status(201).json({
      ...meeting,
      jobId,
    });
  } catch (error) {
    logger.error("Error creating meeting", error as Error, { userEmail });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to create meeting");
  }
});

export const updateMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const { title, date, type, participants, transcript, language, summaryLength, isMeetingPublished } = req.body as any;

  try {
    const existing = await meetingsRepository.findById(targetId);
    if (!existing) {
      throw new NotFoundError("Meeting");
    }

    const updated = await meetingsService.updateMeeting(targetId, {
      title,
      date,
      type,
      participants,
      transcript,
      language,
      summaryLength,
      isMeetingPublished,
    });

    res.json(updated);
  } catch (error) {
    logger.error("Error updating meeting", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to update meeting");
  }
});

export const summarizeMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const { language, summaryLength, template } = req.body || {};

  try {
    const meeting = await meetingsRepository.findById(targetId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      throw new ValidationError("Meeting has no transcript to summarize");
    }

    const jobId = await jobQueue.addJob("summarize_meeting", {
      meetingId: targetId,
      transcript: meeting.transcript,
      title: meeting.title,
      language,
      summaryLength,
      template,
    });

    res.json({
      message: "Meeting summarization queued. Check back shortly for results.",
      jobId,
      meeting,
    });
  } catch (error) {
    logger.error("Error queuing meeting summarization", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to queue meeting summarization");
  }
});

export const chatMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const { question, history } = req.body;
  const userEmail = req.user?.email?.toLowerCase();

  try {
    const meeting = await meetingsRepository.findById(targetId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    if (
      !Array.isArray(meeting.participants) ||
      !meeting.participants.some((p: string) => p.toLowerCase() === userEmail)
    ) {
      throw new AuthorizationError("You are not a participant in this meeting");
    }

    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      throw new ValidationError("Meeting has no transcript to chat with");
    }

    const result = await queryMeetingRAG(question, meeting.transcript, history, undefined, targetId);
    res.json(result);
  } catch (error) {
    logger.error("RAG Chatbot handler error", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to query meeting chatbot");
  }
});

export const deleteMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);

  try {
    const deleted = await meetingsRepository.softDelete(targetId);
    if (!deleted) {
      throw new NotFoundError("Meeting");
    }

    await deleteUserMemoryBySource(targetId);
    res.json({ message: "Meeting deleted successfully", meeting: deleted });
  } catch (error) {
    logger.error("Error deleting meeting", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to delete meeting");
  }
});

export const toggleMeetingPublish = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  const { isMeetingPublished, sharePassword, expiresInHours, removePassword, clearExpiration } = req.body as any;

  try {
    const currentMeeting = await meetingsRepository.findById(targetId);
    if (!currentMeeting) {
      throw new NotFoundError("Meeting");
    }

    const nextPublishedState =
      typeof isMeetingPublished === "boolean" ? isMeetingPublished : !currentMeeting.isMeetingPublished;
    const { hashSharePassword, encryptShareToken } = await import("../../utils/shareUtils");

    let finalPasswordHash = currentMeeting.sharePassword;
    if (removePassword) {
      finalPasswordHash = null;
    } else if (sharePassword && sharePassword.trim().length > 0) {
      finalPasswordHash = await hashSharePassword(sharePassword.trim());
    }

    let finalExpiresAt: Date | null = currentMeeting.shareExpiresAt;
    if (clearExpiration) {
      finalExpiresAt = null;
    } else if (typeof expiresInHours === "number" && expiresInHours > 0) {
      finalExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    const updated = await meetingsRepository.update(targetId, {
      isMeetingPublished: nextPublishedState,
      sharePassword: finalPasswordHash,
      shareExpiresAt: finalExpiresAt,
    });

    const shareToken = encryptShareToken(targetId);

    res.json({
      meeting: updated,
      isMeetingPublished: nextPublishedState,
      hasPassword: !!finalPasswordHash,
      shareExpiresAt: finalExpiresAt,
      shareToken,
    });
  } catch (error) {
    logger.error("Error toggling meeting publish status", error as Error, { meetingId: targetId });
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to update publish status");
  }
});

export const getPublicMeetingByToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = String(req.params.token);
  const password = req.body?.password as string | undefined;

  try {
    const { decryptShareToken, compareSharePassword } = await import("../../utils/shareUtils");
    const payload = decryptShareToken(token);

    if (!payload || !payload.meetingId) {
      throw new NotFoundError("Shared meeting link is invalid or corrupted");
    }

    const meeting = await meetingsRepository.findById(payload.meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting not found");
    }

    if (!meeting.isMeetingPublished) {
      throw new AuthorizationError("This meeting link is not currently published by the owner");
    }

    if (meeting.shareExpiresAt && new Date(meeting.shareExpiresAt) < new Date()) {
      res.status(403).json({
        error: "Link Expired",
        message: `This share link expired on ${new Date(meeting.shareExpiresAt).toLocaleString()}`,
        isExpired: true,
      });
      return;
    }

    if (meeting.sharePassword && meeting.sharePassword.trim().length > 0) {
      if (!password) {
        res.status(401).json({
          requiresPassword: true,
          message: "This shared meeting link is password protected",
        });
        return;
      }

      const isValidPassword = await compareSharePassword(password, meeting.sharePassword);
      if (!isValidPassword) {
        res.status(401).json({
          requiresPassword: true,
          error: "Incorrect Password",
          message: "The access password you entered is incorrect",
        });
        return;
      }
    }

    res.json({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      type: meeting.type,
      participants: meeting.participants,
      summary: meeting.summary,
      transcript: meeting.transcript,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      isMeetingPublished: meeting.isMeetingPublished,
      shareExpiresAt: meeting.shareExpiresAt,
      hasPassword: !!meeting.sharePassword,
    });
  } catch (error) {
    logger.error("Error fetching public meeting by token", error as Error);
    throw error instanceof (Error as any) ? error : new InternalServerError("Failed to load shared meeting");
  }
});

export const archiveMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  try {
    if (!targetId) throw new ValidationError("Meeting Details is Required.");
    const existing = await meetingsRepository.findById(targetId);
    if (!existing) throw new ValidationError("Meeting Details is Required.");

    await meetingsRepository.setArchived(targetId, true);
    res.json({ message: "Meeting Archived Successfully" });
  } catch (error) {
    throw new ValidationError("Meeting Cannot Be Archived");
  }
});

export const unArchiveMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  try {
    if (!targetId) throw new ValidationError("Meeting Details is Required.");
    const existing = await meetingsRepository.findById(targetId);
    if (!existing) throw new ValidationError("Meeting Details is Required.");

    await meetingsRepository.setArchived(targetId, false);
    res.json({ message: "Meeting Archived Successfully" });
  } catch (error) {
    throw new ValidationError("Meeting Cannot Be Archived");
  }
});

export const restoreMeeting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  try {
    if (!targetId) throw new ValidationError("Meeting ID is required.");
    const restored = await meetingsRepository.restore(targetId);
    if (!restored) throw new NotFoundError("Meeting");

    res.json({ message: "Meeting restored successfully", meeting: restored });
  } catch (error) {
    throw new ValidationError("Failed to restore meeting");
  }
});

export const permanentlyDeleteMeeting = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const targetId = String(req.params.id);
    try {
      if (!targetId) throw new ValidationError("Meeting ID is required.");
      const deleted = await meetingsRepository.hardDelete(targetId);
      if (!deleted) throw new NotFoundError("Meeting");

      res.json({ message: "Meeting permanently deleted successfully" });
    } catch (error) {
      throw new ValidationError("Failed to permanently delete meeting");
    }
  }
);

export const toggleMeetingPin = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetId = String(req.params.id);
  try {
    if (!targetId) throw new ValidationError("Meeting ID is required.");
    const meeting = await meetingsRepository.findById(targetId);
    if (!meeting) throw new NotFoundError("Meeting");

    const currentPinStatus = meeting.isPinned;
    const updated = await meetingsRepository.update(targetId, { isPinned: !currentPinStatus });

    res.json({
      message: `Meeting ${!currentPinStatus ? "pinned" : "unpinned"} successfully`,
      meeting: updated,
    });
  } catch (error) {
    throw new ValidationError("Failed to toggle pin status");
  }
});

export const createMeetingClone = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.body.meeting?.id ? String(req.body.meeting.id) : req.body.id ? String(req.body.id) : undefined;
    if (!targetId) throw new ValidationError("Meeting ID is required");

    const cloned = await meetingsService.cloneMeeting(targetId);
    if (!cloned) throw new ValidationError("Meeting Does not Exist");

    res.json({ message: "Meeting Cloned Successfully", meeting: cloned });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new InternalServerError("Failed to clone meeting");
  }
});
