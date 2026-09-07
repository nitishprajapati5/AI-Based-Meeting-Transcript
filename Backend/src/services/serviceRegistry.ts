import { ZodSchema } from "zod";
import { Request, Response } from "express";
import {
  register,
  login,
  logout,
  getUsers,
  getMe,
  changePassword,
  generateMagicLink,
  resetPasswordWithToken,
} from "../modules/auth/auth.controller";
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  summarizeMeeting,
  deleteMeeting,
  toggleMeetingPublish,
  getPublicMeetingByToken,
  chatMeeting,
  archiveMeeting,
  unArchiveMeeting,
  restoreMeeting,
  permanentlyDeleteMeeting,
  toggleMeetingPin,
  createMeetingClone,
} from "../modules/meetings/meetings.controller";
import {
  getActionItems,
  getActionItemsByMeeting,
  getActionItemById,
  getActionItemsLeaderboard,
  createActionItem,
  updateActionItem,
  deleteActionItem,
} from "../modules/action-items/action-items.controller";
import { getDashboardStats } from "../modules/dashboard/dashboard.controller";
import { getUserSettings, updateUserSettings, getUserSessions } from "../modules/settings/settings.controller";
import {
  getNotifications,
  markAllNotificationsRead,
  clearNotifications,
} from "../modules/notifications/notifications.controller";
import {
  queryGlobalChatMemory,
  getChatSessionsList,
  getChatSessionMessages,
  triggerUserMemorySync,
} from "../modules/chat/chat.controller";
import { jobQueue } from "../services/jobQueue";
import { NotFoundError } from "../utils/errors";
import { asyncHandler } from "../middleware/errorHandler";
import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  createMeetingSchema,
  updateMeetingSchema,
  meetingQuerySchema,
  idSchema,
  chatValidationSchema,
  cloneMeetingSchema,
  createActionItemSchema,
  updateActionItemSchema,
  actionItemQuerySchema,
  forgotPassword,
  resetPasswordWithTokenSchema,
  auditLogQuerySchema,
} from "../utils/validation";
import { getAuditStats, getAuditLogs } from "../modules/audit/audit.controller";
import {
  createSeries,
  listSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  assignMeetingToSeries,
  removeMeetingFromSeries,
  getSeriesIntelligence,
} from "../modules/series/series.controller";
import {
  createSeriesSchema,
  updateSeriesSchema,
  assignMeetingToSeriesSchema,
  removeMeetingFromSeriesSchema,
} from "../utils/validation";


export interface ServiceDefinition {
  serviceId: string;
  handler: any;
  requiresAuth: boolean;
  validation?: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
  };
}

// Job status handler
const getJobStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const job = await jobQueue.getJob(jobId);

  if (!job) {
    throw new NotFoundError("Job");
  }

  res.json({
    id: job.id,
    type: job.type,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

export const serviceRegistry: Record<string, ServiceDefinition> = {
  // Auth Services
  "auth.register": {
    serviceId: "auth.register",
    handler: register,
    requiresAuth: false,
    validation: { body: registerSchema },
  },
  "auth.login": {
    serviceId: "auth.login",
    handler: login,
    requiresAuth: false,
    validation: { body: loginSchema },
  },
  "auth.logout": {
    serviceId: "auth.logout",
    handler: logout,
    requiresAuth: false,
  },
  "auth.me": {
    serviceId: "auth.me",
    handler: getMe,
    requiresAuth: true,
  },
  "auth.users": {
    serviceId: "auth.users",
    handler: getUsers,
    requiresAuth: true,
  },
  "auth.changePassword": {
    serviceId: "auth.changePassword",
    handler: changePassword,
    requiresAuth: true,
    validation: { body: updatePasswordSchema },
  },
  "auth.generateMagicLink": {
    serviceId: "auth.generateMagicLink",
    handler: generateMagicLink,
    requiresAuth: false,
    validation: { body: forgotPassword },
  },
  "auth.resetPasswordWithToken": {
    serviceId: "auth.resetPasswordWithToken",
    handler: resetPasswordWithToken,
    requiresAuth: false,
    validation: { body: resetPasswordWithTokenSchema },
  },

  // Meetings Services
  "meetings.list": {
    serviceId: "meetings.list",
    handler: getMeetings,
    requiresAuth: true,
    validation: { query: meetingQuerySchema },
  },
  "meetings.get": {
    serviceId: "meetings.get",
    handler: getMeetingById,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.create": {
    serviceId: "meetings.create",
    handler: createMeeting,
    requiresAuth: true,
    validation: { body: createMeetingSchema },
  },
  "meetings.update": {
    serviceId: "meetings.update",
    handler: updateMeeting,
    requiresAuth: true,
    validation: { params: idSchema, body: updateMeetingSchema },
  },
  "meetings.delete": {
    serviceId: "meetings.delete",
    handler: deleteMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.summarize": {
    serviceId: "meetings.summarize",
    handler: summarizeMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.chat": {
    serviceId: "meetings.chat",
    handler: chatMeeting,
    requiresAuth: true,
    validation: { params: idSchema, body: chatValidationSchema },
  },
  "meetings.publish": {
    serviceId: "meetings.publish",
    handler: toggleMeetingPublish,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.archive": {
    serviceId: "meetings.archive",
    handler: archiveMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.unarchive": {
    serviceId: "meetings.unarchive",
    handler: unArchiveMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.restore": {
    serviceId: "meetings.restore",
    handler: restoreMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.pin": {
    serviceId: "meetings.pin",
    handler: toggleMeetingPin,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.clone": {
    serviceId: "meetings.clone",
    handler: createMeetingClone,
    requiresAuth: true,
    validation: { body: cloneMeetingSchema },
  },
  "meetings.permanentDelete": {
    serviceId: "meetings.permanentDelete",
    handler: permanentlyDeleteMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "meetings.publicShareGet": {
    serviceId: "meetings.publicShareGet",
    handler: getPublicMeetingByToken,
    requiresAuth: false,
  },

  // Action Items Services
  "actionItems.list": {
    serviceId: "actionItems.list",
    handler: getActionItems,
    requiresAuth: true,
    validation: { query: actionItemQuerySchema },
  },
  "actionItems.get": {
    serviceId: "actionItems.get",
    handler: getActionItemById,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "actionItems.getByMeeting": {
    serviceId: "actionItems.getByMeeting",
    handler: getActionItemsByMeeting,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "actionItems.leaderboard": {
    serviceId: "actionItems.leaderboard",
    handler: getActionItemsLeaderboard,
    requiresAuth: true,
  },
  "actionItems.create": {
    serviceId: "actionItems.create",
    handler: createActionItem,
    requiresAuth: true,
    validation: { body: createActionItemSchema },
  },
  "actionItems.update": {
    serviceId: "actionItems.update",
    handler: updateActionItem,
    requiresAuth: true,
    validation: { params: idSchema, body: updateActionItemSchema },
  },
  "actionItems.delete": {
    serviceId: "actionItems.delete",
    handler: deleteActionItem,
    requiresAuth: true,
    validation: { params: idSchema },
  },

  // Dashboard Services
  "dashboard.stats": {
    serviceId: "dashboard.stats",
    handler: getDashboardStats,
    requiresAuth: true,
  },

  // Settings Services
  "settings.get": {
    serviceId: "settings.get",
    handler: getUserSettings,
    requiresAuth: true,
  },
  "settings.update": {
    serviceId: "settings.update",
    handler: updateUserSettings,
    requiresAuth: true,
  },
  "settings.sessions": {
    serviceId: "settings.sessions",
    handler: getUserSessions,
    requiresAuth: true,
  },

  // Notifications Services
  "notifications.list": {
    serviceId: "notifications.list",
    handler: getNotifications,
    requiresAuth: true,
  },
  "notifications.readAll": {
    serviceId: "notifications.readAll",
    handler: markAllNotificationsRead,
    requiresAuth: true,
  },
  "notifications.clear": {
    serviceId: "notifications.clear",
    handler: clearNotifications,
    requiresAuth: true,
  },

  // Jobs Services
  "jobs.get": {
    serviceId: "jobs.get",
    handler: getJobStatus,
    requiresAuth: true,
    validation: { params: idSchema },
  },

  // LangChain Long-Term Memory Chat Services
  "chat.global": {
    serviceId: "chat.global",
    handler: queryGlobalChatMemory,
    requiresAuth: true,
  },
  "chat.sessions.list": {
    serviceId: "chat.sessions.list",
    handler: getChatSessionsList,
    requiresAuth: true,
  },
  "chat.sessions.get": {
    serviceId: "chat.sessions.get",
    handler: getChatSessionMessages,
    requiresAuth: true,
  },
  "memory.sync": {
    serviceId: "memory.sync",
    handler: triggerUserMemorySync,
    requiresAuth: true,
  },

  // Audit & Security Log Services
  "audit.stats": {
    serviceId: "audit.stats",
    handler: getAuditStats,
    requiresAuth: true,
  },
  "audit.logs": {
    serviceId: "audit.logs",
    handler: getAuditLogs,
    requiresAuth: true,
    validation: { query: auditLogQuerySchema },
  },
  // Series Services
  "series.create": {
    serviceId: "series.create",
    handler: createSeries,
    requiresAuth: true,
    validation: { body: createSeriesSchema },
  },
  "series.list": {
    serviceId: "series.list",
    handler: listSeries,
    requiresAuth: true,
  },
  "series.get": {
    serviceId: "series.get",
    handler: getSeriesById,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "series.update": {
    serviceId: "series.update",
    handler: updateSeries,
    requiresAuth: true,
    validation: { params: idSchema, body: updateSeriesSchema },
  },
  "series.delete": {
    serviceId: "series.delete",
    handler: deleteSeries,
    requiresAuth: true,
    validation: { params: idSchema },
  },
  "series.assignMeeting": {
    serviceId: "series.assignMeeting",
    handler: assignMeetingToSeries,
    requiresAuth: true,
    validation: { body: assignMeetingToSeriesSchema },
  },
  "series.removeMeeting": {
    serviceId: "series.removeMeeting",
    handler: removeMeetingFromSeries,
    requiresAuth: true,
    validation: { body: removeMeetingFromSeriesSchema },
  },
  "series.intelligence": {
    serviceId: "series.intelligence",
    handler: getSeriesIntelligence,
    requiresAuth: true,
    validation: { params: idSchema },
  },
};
