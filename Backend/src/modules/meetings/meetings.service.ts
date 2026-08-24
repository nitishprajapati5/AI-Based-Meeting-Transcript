import { meetingsRepository, MeetingsRepository } from "./meetings.repository";
import { generateMeetingSummary, processAndSaveTranscriptEmbeddings, queryMeetingRAG } from "../../services/aiService";
import { indexMeetingMemory } from "../../services/langchain/memoryIndexer";
import { deleteUserMemoryBySource } from "../../services/langchain/vectorStore";
import { jobQueue } from "../../services/jobQueue";
import { MeetingSummary } from "../../db/schema";
import db from "../../db";
import { meetingChunks, meetings } from "../../db/schema";
import { eq } from "drizzle-orm";

export class MeetingsService {
  constructor(private repo: MeetingsRepository = meetingsRepository) {}

  async syncActionItems(meetingId: string, summary: MeetingSummary | null) {
    return this.repo.syncActionItems(meetingId, summary);
  }

  async createMeetingWithJob(data: {
    title: string;
    date: string;
    participants: string[];
    transcript?: string;
    type?: string;
    language?: string;
    summaryLength?: any;
    template?: any;
    customPrompt?: string;
    userEmail: string;
  }) {
    let finalParticipants = data.participants || [];
    if (!finalParticipants.some((p) => p.toLowerCase() === data.userEmail.toLowerCase())) {
      finalParticipants = [...finalParticipants, data.userEmail];
    }

    const meetingId = Date.now().toString();
    const newMeeting = {
      id: meetingId,
      title: data.title,
      date: data.date,
      type: data.type || "meeting",
      participants: finalParticipants,
      transcript: data.transcript || "",
      summary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await this.repo.create(newMeeting);
    let jobId: string | undefined;

    if (data.transcript && data.transcript.trim().length > 0) {
      await processAndSaveTranscriptEmbeddings(meetingId, data.transcript);
      jobId = await jobQueue.addJob("summarize_meeting", {
        meetingId,
        transcript: data.transcript,
        title: data.title,
        language: data.language,
        summaryLength: data.summaryLength,
        template: data.template,
        customPrompt: data.customPrompt,
      });
    }

    return { meeting: inserted, jobId };
  }

  async updateMeeting(id: string, updates: any) {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    let generatedSummary: MeetingSummary | null | undefined = undefined;
    if (updates.transcript !== undefined && updates.transcript.trim().length > 0) {
      generatedSummary = await generateMeetingSummary(
        updates.transcript,
        updates.title || existing.title,
        undefined,
        updates.language,
        updates.summaryLength
      );
    }

    const updated = await this.repo.update(id, {
      ...(updates.title ? { title: updates.title } : {}),
      ...(updates.date ? { date: updates.date } : {}),
      ...(updates.type ? { type: updates.type } : {}),
      ...(updates.participants ? { participants: updates.participants } : {}),
      ...(updates.transcript !== undefined ? { transcript: updates.transcript } : {}),
      ...(updates.isMeetingPublished !== undefined ? { isMeetingPublished: updates.isMeetingPublished } : {}),
      ...(generatedSummary !== undefined ? { summary: generatedSummary } : {}),
    });

    if (generatedSummary) {
      await this.repo.syncActionItems(id, generatedSummary);
    }

    if (updates.transcript !== undefined && updates.transcript !== null) {
      await processAndSaveTranscriptEmbeddings(id, updates.transcript);
    }

    if (updated) {
      await indexMeetingMemory(updated);
    }

    return updated;
  }

  async cloneMeeting(targetId: string) {
    const originalMeeting = await this.repo.findById(targetId);
    if (!originalMeeting) return null;

    const newId = Date.now().toString();
    const cloned = await this.repo.create({
      ...originalMeeting,
      date: new Date().toISOString().split("T")[0],
      id: newId,
      title: `${originalMeeting.title} (Copy)`,
      isDeleted: false,
      isArchived: false,
      isPinned: false,
      shareExpiresAt: null,
      sharePassword: null,
      isArchivedAt: null,
      isDeletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.syncActionItems(newId, originalMeeting.summary);

    if (originalMeeting.transcript && originalMeeting.transcript.trim().length > 0) {
      const originalChunks = await db.select().from(meetingChunks).where(eq(meetingChunks.meetingId, targetId));
      if (originalChunks && originalChunks.length > 0) {
        const newChunks = originalChunks.map((chunk, index) => ({
          id: `${newId}-chunk-${Date.now()}-${index}`,
          meetingId: newId,
          content: chunk.content,
          embedding: chunk.embedding,
          createdAt: new Date(),
        }));
        await db.insert(meetingChunks).values(newChunks);
      }
    }

    if (cloned) {
      await indexMeetingMemory(cloned);
    }

    return cloned;
  }
}

export const meetingsService = new MeetingsService();
