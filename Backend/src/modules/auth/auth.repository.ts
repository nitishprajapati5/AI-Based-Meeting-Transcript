import db from "../../db";
import { users, userSessions, UserRecord, NewUserRecord } from "../../db/schema";
import { eq } from "drizzle-orm";

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async createUser(user: NewUserRecord): Promise<UserRecord> {
    const inserted = await db.insert(users).values(user).returning();
    return inserted[0];
  }

  async updatePassword(emailOrId: { id?: string; email?: string }, hashedPassword: string): Promise<void> {
    if (emailOrId.id) {
      await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, emailOrId.id));
    } else if (emailOrId.email) {
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.email, emailOrId.email));
    }
  }

  async findAllUsers(): Promise<Array<{ id: string; name: string; email: string; createdAt: Date | null }>> {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users);
  }

  async createSession(session: any): Promise<void> {
    await db.update(userSessions).set({ isCurrent: false }).where(eq(userSessions.userId, session.userId));
    await db.insert(userSessions).values(session);
  }
}

export const authRepository = new AuthRepository();
