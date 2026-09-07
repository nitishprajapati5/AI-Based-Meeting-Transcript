import { auditRepository, LogFilterParams } from "./audit.repository";

export class AuditService {
  async getLogs(params: LogFilterParams) {
    return auditRepository.findLogs(params);
  }

  async getStats() {
    const rawStats = await auditRepository.getStats();
    const { counts, topServices, recentErrors, latency } = rawStats;

    const total = counts.total || 0;
    const successCount = counts.success2xx || 0;
    const errorCount = (counts.clientError4xx || 0) + (counts.serverError5xx || 0);

    const successRate = total > 0 ? Number(((successCount / total) * 100).toFixed(1)) : 100;
    const errorRate = total > 0 ? Number(((errorCount / total) * 100).toFixed(1)) : 0;

    let healthStatus: "Operational" | "Degraded" | "Critical" = "Operational";
    if (total > 10) {
      if (errorRate > 15) {
        healthStatus = "Critical";
      } else if (errorRate > 5) {
        healthStatus = "Degraded";
      }
    }

    return {
      health: {
        status: healthStatus,
        totalRequests: total,
        successCount,
        errorCount,
        successRate,
        errorRate,
        avgLatencyMs: latency.avgLatencyMs,
        p95LatencyMs: latency.p95LatencyMs,
      },
      statusBreakdown: {
        success2xx: counts.success2xx,
        redirect3xx: counts.redirect3xx,
        clientError4xx: counts.clientError4xx,
        serverError5xx: counts.serverError5xx,
      },
      topServices,
      recentErrors,
    };
  }
}

export const auditService = new AuditService();
