import db from "../../db";
import { actionItems, meetings, users } from "../../db/schema";
import { eq, and, or, inArray, desc, sql } from "drizzle-orm";

export class ActionItemsRepository {
  async findById(id: string) {
    const result = await db.select().from(actionItems).where(eq(actionItems.id, id));
    return result[0] || null;
  }

  async findByMeetingId(meetingId: string) {
    return db.select().from(actionItems).where(eq(actionItems.meetingId, meetingId));
  }

  async findPaginated(params: {
    currentUserEmail: string;
    userId?: string;
    meetingId?: string;
    status?: string;
    priority?: string;
    page: number;
    limit: number;
    offset: number;
  }) {
    const { currentUserEmail, userId, meetingId, status, priority, limit, offset, page } = params;

    const accessibleMeetings = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        and(
          sql`${meetings.participants} @> ${JSON.stringify([currentUserEmail])}::jsonb`,
          eq(meetings.isArchived, false),
          eq(meetings.isDeleted, false)
        )
      );

    const userMeetingIds = accessibleMeetings.map((m) => m.id);
    const conditions = [eq(actionItems.isArchived, false)];

    const accessConditions = [sql`LOWER(${actionItems.owner}) = ${currentUserEmail}`];
    if (userId) {
      accessConditions.push(eq(actionItems.userId, userId));
    }
    if (userMeetingIds.length > 0) {
      accessConditions.push(inArray(actionItems.meetingId, userMeetingIds));
    }

    conditions.push(or(...accessConditions)!);

    if (meetingId) {
      conditions.push(eq(actionItems.meetingId, meetingId));
    }
    if (status && status !== "All") {
      conditions.push(sql`LOWER(${actionItems.status}) = ${status.toLowerCase()}`);
    }
    if (priority && priority !== "All") {
      conditions.push(sql`LOWER(${actionItems.priority}) = ${priority.toLowerCase()}`);
    }

    const whereClause = and(...conditions);

    const [paginatedItems, countResult] = await Promise.all([
      db.select().from(actionItems).where(whereClause).orderBy(desc(actionItems.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(actionItems)
        .where(whereClause),
    ]);

    return {
      items: paginatedItems,
      total: countResult[0]?.count || 0,
    };
  }

  async findAllUnarchived() {
    return db.select().from(actionItems).where(eq(actionItems.isArchived, false));
  }

  async create(data: any) {
    const inserted = await db.insert(actionItems).values(data).returning();
    return inserted[0];
  }

  async update(id: string, data: any) {
    const updated = await db
      .update(actionItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(actionItems.id, id))
      .returning();
    return updated[0];
  }

  async delete(id: string) {
    const deleted = await db.delete(actionItems).where(eq(actionItems.id, id)).returning();
    return deleted[0];
  }
}

export const actionItemsRepository = new ActionItemsRepository();
