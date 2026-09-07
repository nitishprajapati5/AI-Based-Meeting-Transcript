import db from "../../db";
import { requestLogs } from "../../db/schema";
import { desc, and, gte, lt, eq, sql } from "drizzle-orm";

export interface LogFilterParams {
  page: number;
  limit: number;
  statusGroup?: "all" | "2xx" | "3xx" | "4xx" | "5xx" | "errors";
  method?: string;
  search?: string;
  serviceId?: string;
}

export class AuditRepository {
  async findLogs(params: LogFilterParams) {
    const { page, limit, statusGroup, method, search, serviceId } = params;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Status group filtering
    if (statusGroup && statusGroup !== "all") {
      if (statusGroup === "2xx") {
        conditions.push(and(gte(requestLogs.status, 200), lt(requestLogs.status, 300)));
      } else if (statusGroup === "3xx") {
        conditions.push(and(gte(requestLogs.status, 300), lt(requestLogs.status, 400)));
      } else if (statusGroup === "4xx") {
        conditions.push(and(gte(requestLogs.status, 400), lt(requestLogs.status, 500)));
      } else if (statusGroup === "5xx") {
        conditions.push(and(gte(requestLogs.status, 500), lt(requestLogs.status, 600)));
      } else if (statusGroup === "errors") {
        conditions.push(gte(requestLogs.status, 400));
      }
    }

    // Method filter
    if (method && method !== "ALL") {
      conditions.push(eq(requestLogs.method, method.toUpperCase()));
    }

    // Specific ServiceId filter
    if (serviceId) {
      conditions.push(eq(requestLogs.serviceId, serviceId));
    }

    // Free text search on path, serviceId, or ipAddress
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${requestLogs.path}) LIKE ${searchTerm} OR LOWER(COALESCE(${requestLogs.serviceId}, '')) LIKE ${searchTerm} OR LOWER(COALESCE(${requestLogs.ipAddress}, '')) LIKE ${searchTerm})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run query and total count
    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(requestLogs)
        .where(whereClause)
        .orderBy(desc(requestLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(requestLogs)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats() {
    // 1. Total request count and breakdown by status categories
    const countsResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        success2xx: sql<number>`count(case when ${requestLogs.status} >= 200 and ${requestLogs.status} < 300 then 1 end)::int`,
        redirect3xx: sql<number>`count(case when ${requestLogs.status} >= 300 and ${requestLogs.status} < 400 then 1 end)::int`,
        clientError4xx: sql<number>`count(case when ${requestLogs.status} >= 400 and ${requestLogs.status} < 500 then 1 end)::int`,
        serverError5xx: sql<number>`count(case when ${requestLogs.status} >= 500 then 1 end)::int`,
      })
      .from(requestLogs);

    const counts = countsResult[0] || {
      total: 0,
      success2xx: 0,
      redirect3xx: 0,
      clientError4xx: 0,
      serverError5xx: 0,
    };

    // 2. Top 5 active service endpoints
    const topServices = await db
      .select({
        serviceId: requestLogs.serviceId,
        count: sql<number>`count(*)::int`,
      })
      .from(requestLogs)
      .where(sql`${requestLogs.serviceId} IS NOT NULL`)
      .groupBy(requestLogs.serviceId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // 3. Recent 8 errors (status >= 400)
    const recentErrors = await db
      .select()
      .from(requestLogs)
      .where(gte(requestLogs.status, 400))
      .orderBy(desc(requestLogs.createdAt))
      .limit(8);

    // 4. Latency sampling (most recent 100 requests)
    const recentSamples = await db
      .select({
        duration: requestLogs.duration,
      })
      .from(requestLogs)
      .where(sql`${requestLogs.duration} IS NOT NULL`)
      .orderBy(desc(requestLogs.createdAt))
      .limit(100);

    const durationsMs: number[] = [];
    for (const sample of recentSamples) {
      if (sample.duration) {
        const parsed = parseFloat(sample.duration.replace("ms", "").trim());
        if (!isNaN(parsed)) {
          durationsMs.push(parsed);
        }
      }
    }

    let avgLatencyMs = 0;
    let p95LatencyMs = 0;

    if (durationsMs.length > 0) {
      const sum = durationsMs.reduce((acc, val) => acc + val, 0);
      avgLatencyMs = Math.round(sum / durationsMs.length);

      durationsMs.sort((a, b) => a - b);
      const p95Index = Math.min(Math.floor(durationsMs.length * 0.95), durationsMs.length - 1);
      p95LatencyMs = Math.round(durationsMs[p95Index]);
    }

    return {
      counts,
      topServices: topServices.map((s) => ({
        serviceId: s.serviceId || "unknown",
        count: s.count,
      })),
      recentErrors,
      latency: {
        avgLatencyMs,
        p95LatencyMs,
        samplesCount: durationsMs.length,
      },
    };
  }
}

export const auditRepository = new AuditRepository();
