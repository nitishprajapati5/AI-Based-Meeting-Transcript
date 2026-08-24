import db from "../../db";
import { meetings, actionItems, users, meetingChunks, MeetingSummary } from "../../db/schema";
import { eq, and, or, sql, desc, getTableColumns } from "drizzle-orm";

export class MeetingsRepository {
  async findById(id: string) {
    const result = await db.select().from(meetings).where(eq(meetings.id, id));
    return result[0] || null;
  }

  async findPaginated(
    userEmail: string,
    params: {
      search?: string;
      type?: string;
      page: number;
      limit: number;
      offset: number;
      isArchived: boolean;
      isDeleted: boolean;
    }
  ) {
    const { search, type, limit, offset, isArchived, isDeleted } = params;
    const conditions = [
      sql`${meetings.participants} @> ${JSON.stringify([userEmail])}::jsonb`,
      eq(meetings.isArchived, isArchived),
      eq(meetings.isDeleted, isDeleted),
    ];

    if (type && type !== "All") {
      conditions.push(eq(meetings.type, type));
    }

    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.toLowerCase().trim()}%`;
      conditions.push(
        or(
          sql`LOWER(${meetings.title}) LIKE ${searchPattern}`,
          sql`LOWER(${meetings.transcript}) LIKE ${searchPattern}`,
          sql`${meetings.participants}::text ILIKE ${searchPattern}`
        )!
      );
    }

    const whereClause = and(...conditions);

    const [paginatedItems, countResult] = await Promise.all([
      db
        .select({
          ...getTableColumns(meetings),
          hasChunks: sql<boolean>`COUNT(${meetingChunks.id}) > 0`,
        })
        .from(meetings)
        .leftJoin(meetingChunks, eq(meetingChunks.meetingId, meetings.id))
        .where(whereClause)
        .groupBy(meetings.id)
        .orderBy(desc(meetings.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(DISTINCT ${meetings.id})::int` })
        .from(meetings)
        .where(whereClause),
    ]);

    return {
      items: paginatedItems,
      total: countResult[0]?.count || 0,
    };
  }

  async create(data: any) {
    const inserted = await db.insert(meetings).values(data).returning();
    return inserted[0];
  }

  async update(id: string, data: any) {
    const updated = await db
      .update(meetings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, id))
      .returning();
    return updated[0];
  }

  async softDelete(id: string) {
    const updated = await db
      .update(meetings)
      .set({ isArchived: false, isDeleted: true, isDeletedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    return updated[0];
  }

  async hardDelete(id: string) {
    const deleted = await db.delete(meetings).where(eq(meetings.id, id)).returning();
    return deleted[0];
  }

  async setArchived(id: string, isArchived: boolean) {
    const updated = await db
      .update(meetings)
      .set({ isArchived, isArchivedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();

    await db.update(actionItems).set({ isArchived, isArchivedAt: new Date() }).where(eq(actionItems.meetingId, id));

    return updated[0];
  }

  async restore(id: string) {
    const restored = await db
      .update(meetings)
      .set({ isDeleted: false, isDeletedAt: null })
      .where(eq(meetings.id, id))
      .returning();
    return restored[0];
  }

  async syncActionItems(meetingId: string, summary: MeetingSummary | null) {
    await db.delete(actionItems).where(eq(actionItems.meetingId, meetingId));
    if (!summary || !summary.actionItems || summary.actionItems.length === 0) return;

    const allUsers = await db.select().from(users);
    const userEmailMap = new Map(allUsers.map((u: { email: string; id: any }) => [u.email.toLowerCase(), u.id]));

    const rowsToInsert = summary.actionItems.map((item, index) => {
      let matchedUserId: string | null = null;
      if (item.owner && item.owner !== "Unassigned") {
        matchedUserId = (userEmailMap.get(item.owner.toLowerCase()) as string) || null;
      }
      return {
        id: `${meetingId}-item-${Date.now()}-${index}`,
        meetingId,
        userId: matchedUserId,
        task: item.task,
        owner: item.owner || "Unassigned",
        dueDate: item.dueDate || "Not specified",
        priority: item.priority || "Medium",
        status: item.status || "Pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    if (rowsToInsert.length > 0) {
      await db.insert(actionItems).values(rowsToInsert);
    }
  }
}

export const meetingsRepository = new MeetingsRepository();
