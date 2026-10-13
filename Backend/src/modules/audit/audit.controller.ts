import { Response } from "express";
import { auditService } from "./audit.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";

/**
 * GET /api/audit/stats (or serviceId: 'audit.stats')
 * Computes overall API health, uptime status, latency percentiles, and error logs
 */
export const getAuditStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = await auditService.getStats();
  res.json(stats);
});

/**
 * GET /api/audit/logs (or serviceId: 'audit.logs')
 * Returns paginated, searchable, and filtered request audit logs
 */
export const getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const statusGroup = req.query.statusGroup as any;
  const method = req.query.method ? String(req.query.method) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const serviceId = req.query.serviceId ? String(req.query.serviceId) : undefined;

  const result = await auditService.getLogs({
    page,
    limit,
    statusGroup,
    method,
    search,
    serviceId,
  });

  res.json(result);
});
