import { queryUserLongTermMemory, getSessionMessageHistory } from "../../services/langchain/userMemoryChain";
import { syncAllUserMemories } from "../../services/langchain/memoryIndexer";
import db from "../../db";
import { chatSessions, chatMessages } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export class ChatService {
  async queryMemory(params: {
    userId: string;
    userEmail: string;
    question: string;
    sessionId?: string;
    meetingId?: string;
  }) {
    return queryUserLongTermMemory({
      userId: params.userId,
      userEmail: params.userEmail,
      question: params.question,
      sessionId: params.sessionId,
      meetingIdFilter: params.meetingId,
    });
  }

  async getSessions(userId: string) {
    return db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(20);
  }

  async getSessionMessages(userId: string, sessionId: string) {
    const session = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId));
    if (session.length === 0 || session[0].userId !== userId) {
      return null;
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt));

    return { session: session[0], messages: messages.reverse() };
  }

  async syncUserMemories(userId: string, userEmail: string) {
    return syncAllUserMemories(userId, userEmail);
  }
}

export const chatService = new ChatService();
