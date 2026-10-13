/**
 * Centralized Service ID constants (Auto-generated)
 */
export const SERVICE_IDS = {
  MEETINGS: {
    ARCHIVE: "meetings.archive",
    CHAT: "meetings.chat",
    CLONE: "meetings.clone",
    CREATE: "meetings.create",
    DELETE: "meetings.delete",
    GET: "meetings.get",
    LIST: "meetings.list",
    PERMANENT_DELETE: "meetings.permanentDelete",
    PIN: "meetings.pin",
    PUBLIC_SHARE_GET: "meetings.publicShareGet",
    PUBLISH: "meetings.publish",
    RESTORE: "meetings.restore",
    SUMMARIZE: "meetings.summarize",
    UNARCHIVE: "meetings.unarchive",
    UPDATE: "meetings.update",
  },
  ACTION_ITEMS: {
    CREATE: "actionItems.create",
    DELETE: "actionItems.delete",
    GET: "actionItems.get",
    GET_BY_MEETING: "actionItems.getByMeeting",
    LEADERBOARD: "actionItems.leaderboard",
    LIST: "actionItems.list",
    UPDATE: "actionItems.update",
  },
  DASHBOARD: {
    STATS: "dashboard.stats",
  },
  SETTINGS: {
    GET: "settings.get",
    SESSIONS: "settings.sessions",
    UPDATE: "settings.update",
  },
  NOTIFICATIONS: {
    CLEAR: "notifications.clear",
    LIST: "notifications.list",
    READ_ALL: "notifications.readAll",
  },
  JOBS: {
    GET: "jobs.get",
  },
  AUTH: {
    CHANGE_PASSWORD: "auth.changePassword",
    GENERATE_MAGIC_LINK: "auth.generateMagicLink",
    LOGIN: "auth.login",
    LOGOUT: "auth.logout",
    ME: "auth.me",
    REGISTER: "auth.register",
    RESET_PASSWORD_WITH_TOKEN: "auth.resetPasswordWithToken",
    USERS: "auth.users",
  },
  AUDIT: {
    LOGS: "audit.logs",
    STATS: "audit.stats",
  },
  CHAT: {
    GLOBAL: "chat.global",
    MEMORY_SYNC: "memory.sync",
    SESSIONS_LIST: "chat.sessions.list",
    SESSIONS_GET: "chat.sessions.get",
  },
  SERIES: {
    CREATE: "series.create",
    LIST: "series.list",
    GET: "series.get",
    UPDATE: "series.update",
    DELETE: "series.delete",
    ASSIGN_MEETING: "series.assignMeeting",
    REMOVE_MEETING: "series.removeMeeting",
    INTELLIGENCE: "series.intelligence",
  },
} as const;

export type SERVICE_IDS_TYPE = typeof SERVICE_IDS;

export type ServiceId =
  | (typeof SERVICE_IDS.MEETINGS)[keyof typeof SERVICE_IDS.MEETINGS]
  | (typeof SERVICE_IDS.ACTION_ITEMS)[keyof typeof SERVICE_IDS.ACTION_ITEMS]
  | (typeof SERVICE_IDS.DASHBOARD)[keyof typeof SERVICE_IDS.DASHBOARD]
  | (typeof SERVICE_IDS.SETTINGS)[keyof typeof SERVICE_IDS.SETTINGS]
  | (typeof SERVICE_IDS.NOTIFICATIONS)[keyof typeof SERVICE_IDS.NOTIFICATIONS]
  | (typeof SERVICE_IDS.JOBS)[keyof typeof SERVICE_IDS.JOBS]
  | (typeof SERVICE_IDS.AUTH)[keyof typeof SERVICE_IDS.AUTH]
  | (typeof SERVICE_IDS.AUDIT)[keyof typeof SERVICE_IDS.AUDIT]
  | (typeof SERVICE_IDS.CHAT)[keyof typeof SERVICE_IDS.CHAT]
  | (typeof SERVICE_IDS.SERIES)[keyof typeof SERVICE_IDS.SERIES];
