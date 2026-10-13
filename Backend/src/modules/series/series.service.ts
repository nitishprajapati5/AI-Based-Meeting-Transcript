import { seriesRepository } from "./series.repository";
import { generateCrossMeetingIntelligence } from "../../services/aiService";
import { logger } from "../../utils/logger";

export class SeriesService {
  /** Create a new series */
  async createSeries(data: {
    userId: string;
    title: string;
    description?: string;
    color?: string;
    recurrenceLabel?: string;
  }) {
    const id = Date.now().toString();
    return seriesRepository.create({ id, ...data });
  }

  /** List all series for a user with meeting counts */
  async listSeries(userId: string) {
    return seriesRepository.findAllByUser(userId);
  }

  /** Get a series and all its meetings */
  async getSeriesWithMeetings(seriesId: string) {
    const series = await seriesRepository.findById(seriesId);
    if (!series) return null;

    const meetings = await seriesRepository.findMeetingsInSeries(seriesId);
    return { ...series, meetings };
  }

  /** Update series metadata */
  async updateSeries(
    id: string,
    data: Partial<{ title: string; description: string; color: string; recurrenceLabel: string }>
  ) {
    return seriesRepository.update(id, data);
  }

  /** Delete a series */
  async deleteSeries(id: string) {
    return seriesRepository.delete(id);
  }

  /**
   * Assign a meeting to a series.
   * Auto-calculates the next occurrence number if not provided.
   */
  async assignMeetingToSeries(meetingId: string, seriesId: string, occurrence?: number) {
    let finalOccurrence = occurrence;
    if (!finalOccurrence) {
      const count = await seriesRepository.countMeetingsInSeries(seriesId);
      finalOccurrence = count + 1;
    }
    return seriesRepository.assignMeetingToSeries(meetingId, seriesId, finalOccurrence);
  }

  /** Remove a meeting from its series */
  async removeMeetingFromSeries(meetingId: string) {
    return seriesRepository.removeMeetingFromSeries(meetingId);
  }

  /**
   * Generate cross-meeting AI intelligence for a series.
   * Fetches the last `limit` meetings and runs multi-meeting analysis.
   */
  async getSeriesIntelligence(seriesId: string, limit = 10) {
    const meetings = await seriesRepository.findMeetingsInSeries(seriesId);
    const targetMeetings = meetings.slice(-limit);

    if (targetMeetings.length === 0) {
      return null;
    }

    try {
      const intelligence = await generateCrossMeetingIntelligence(targetMeetings);
      return intelligence;
    } catch (error) {
      logger.error("Failed to generate cross-meeting intelligence", error as Error, { seriesId });
      throw error;
    }
  }
}

export const seriesService = new SeriesService();
