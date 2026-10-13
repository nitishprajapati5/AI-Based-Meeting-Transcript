import db from "../../db";
import { meetingSeries, meetings } from "../../db/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";

export class SeriesRepository {
  /** List all series for a user, with meeting count */
  async findAllByUser(userId: string) {
    const rows = await db
      .select({
        id: meetingSeries.id,
        userId: meetingSeries.userId,
        title: meetingSeries.title,
        description: meetingSeries.description,
        color: meetingSeries.color,
        recurrenceLabel: meetingSeries.recurrenceLabel,
        createdAt: meetingSeries.createdAt,
        updatedAt: meetingSeries.updatedAt,
        meetingCount: sql<number>`COUNT(DISTINCT ${meetings.id})::int`,
        lastMeetingDate: sql<string | null>`MAX(${meetings.date})`,
      })
      .from(meetingSeries)
      .leftJoin(meetings, eq(meetings.seriesId, meetingSeries.id))
      .where(eq(meetingSeries.userId, userId))
      .groupBy(meetingSeries.id)
      .orderBy(desc(meetingSeries.createdAt));

    return rows;
  }

  /** Get a single series by ID */
  async findById(id: string) {
    const result = await db.select().from(meetingSeries).where(eq(meetingSeries.id, id));
    return result[0] || null;
  }

  /** Get all meetings belonging to a series, ordered by occurrence then date */
  async findMeetingsInSeries(seriesId: string) {
    const rows = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.seriesId, seriesId), eq(meetings.isDeleted, false)))
      .orderBy(asc(meetings.seriesOccurrence), asc(meetings.date));
    return rows;
  }

  /** Create a new series */
  async create(data: {
    id: string;
    userId: string;
    title: string;
    description?: string;
    color?: string;
    recurrenceLabel?: string;
  }) {
    const inserted = await db
      .insert(meetingSeries)
      .values({
        id: data.id,
        userId: data.userId,
        title: data.title,
        description: data.description || "",
        color: data.color || "#6366f1",
        recurrenceLabel: data.recurrenceLabel || "Weekly",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return inserted[0];
  }

  /** Update series metadata */
  async update(
    id: string,
    data: Partial<{ title: string; description: string; color: string; recurrenceLabel: string }>
  ) {
    const updated = await db
      .update(meetingSeries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(meetingSeries.id, id))
      .returning();
    return updated[0];
  }

  /** Delete a series — meetings have seriesId set null via ON DELETE SET NULL */
  async delete(id: string) {
    const deleted = await db.delete(meetingSeries).where(eq(meetingSeries.id, id)).returning();
    return deleted[0];
  }

  /** Assign a meeting to a series and set its occurrence number */
  async assignMeetingToSeries(meetingId: string, seriesId: string, occurrence: number) {
    const updated = await db
      .update(meetings)
      .set({ seriesId, seriesOccurrence: occurrence, updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))
      .returning();
    return updated[0];
  }

  /** Remove a meeting from its series */
  async removeMeetingFromSeries(meetingId: string) {
    const updated = await db
      .update(meetings)
      .set({ seriesId: null, seriesOccurrence: null, updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))
      .returning();
    return updated[0];
  }

  /** Count meetings already in a series (to auto-assign occurrence) */
  async countMeetingsInSeries(seriesId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(meetings)
      .where(and(eq(meetings.seriesId, seriesId), eq(meetings.isDeleted, false)));
    return result[0]?.count || 0;
  }
}

export const seriesRepository = new SeriesRepository();
