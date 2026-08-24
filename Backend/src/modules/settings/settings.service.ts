import db from "../../db";
import { userSettings, userSessions, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "../../utils/errors";

const DEFAULT_PROMPT = "Focus heavily on technical decisions, code deliverables, and explicit action item due dates.";

export class SettingsService {
  async resolveUserId(userIdFromToken?: string, emailFromToken?: string): Promise<string> {
    if (userIdFromToken) return userIdFromToken;
    if (!emailFromToken) throw new ValidationError("User authentication required");

    const foundUsers = await db.select().from(users).where(eq(users.email, emailFromToken.toLowerCase())).limit(1);
    if (foundUsers.length === 0) throw new NotFoundError("User account");
    return foundUsers[0].id;
  }

  async getSettings(userId: string, userEmail: string) {
    const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    if (existing.length > 0) return existing[0];

    const defaultRow = {
      userId,
      summaryLength: "Medium",
      template: "Standard",
      customPrompt: DEFAULT_PROMPT,
      autoExtractActionItems: true,
      emailNotifications: true,
      weeklyDigest: false,
      slackWebhookUrl: "",
      updatedAt: new Date(),
    };

    const inserted = await db.insert(userSettings).values(defaultRow).returning();
    return inserted[0];
  }

  async updateSettings(userId: string, updates: any) {
    const updatedData = {
      summaryLength: updates.summaryLength || "Medium",
      template: updates.template || "Standard",
      customPrompt: updates.customPrompt !== undefined ? updates.customPrompt : DEFAULT_PROMPT,
      autoExtractActionItems:
        updates.autoExtractActionItems !== undefined ? Boolean(updates.autoExtractActionItems) : true,
      emailNotifications: updates.emailNotifications !== undefined ? Boolean(updates.emailNotifications) : true,
      weeklyDigest: updates.weeklyDigest !== undefined ? Boolean(updates.weeklyDigest) : false,
      slackWebhookUrl: updates.slackWebhookUrl || "",
      updatedAt: new Date(),
    };

    const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    let result;
    if (existing.length > 0) {
      result = await db.update(userSettings).set(updatedData).where(eq(userSettings.userId, userId)).returning();
    } else {
      result = await db
        .insert(userSettings)
        .values({ userId, ...updatedData })
        .returning();
    }
    return result[0];
  }

  async getSessions(userId: string, reqInfo: { ipAddress: string; userAgent: string }) {
    const sessions = await db.select().from(userSessions).where(eq(userSessions.userId, userId));
    if (sessions.length > 0) return sessions;

    const { ipAddress, userAgent } = reqInfo;
    let device = "Desktop";
    if (/mobile/i.test(userAgent)) device = "Mobile";

    let browser = "Chrome";
    if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";

    let os = "Mac OS X";
    if (/windows/i.test(userAgent)) os = "Windows";

    return [
      {
        id: "sess-current",
        userId,
        ipAddress: ipAddress === "::1" ? "127.0.0.1" : ipAddress,
        device,
        browser,
        os,
        location: "Current Session (Localhost)",
        isCurrent: true,
        lastActive: new Date(),
        createdAt: new Date(),
      },
    ];
  }
}

export const settingsService = new SettingsService();
