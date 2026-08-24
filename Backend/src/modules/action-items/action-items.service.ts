import { actionItemsRepository, ActionItemsRepository } from "./action-items.repository";
import { indexActionItemMemory } from "../../services/langchain/memoryIndexer";
import { deleteUserMemoryBySource } from "../../services/langchain/vectorStore";
import { invalidateCache } from "../../utils/cache";
import db from "../../db";
import { users, meetings } from "../../db/schema";
import { eq } from "drizzle-orm";

export class ActionItemsService {
  constructor(private repo: ActionItemsRepository = actionItemsRepository) {}

  async createItem(input: {
    task: string;
    owner?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    meetingId: string;
    userEmail?: string;
  }) {
    let matchedUserId: string | null = null;
    if (input.owner && input.owner !== "Unassigned") {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, input.owner.toLowerCase().trim()))
        .limit(1);
      if (userResult.length > 0) {
        matchedUserId = userResult[0].id;
      }
    }

    const newItemId = `item-${Date.now()}`;
    const created = await this.repo.create({
      id: newItemId,
      meetingId: input.meetingId,
      userId: matchedUserId,
      task: input.task,
      owner: input.owner || "Unassigned",
      dueDate: input.dueDate || "Not specified",
      priority: input.priority || "Medium",
      status: input.status || "Pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (created) {
      await indexActionItemMemory(created);
    }
    if (input.userEmail) {
      invalidateCache.dashboard(input.userEmail);
    }

    return created;
  }

  async updateItem(id: string, updates: any, userEmail?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    let updatedUserId = existing.userId;
    if (updates.owner && updates.owner !== existing.owner && updates.owner !== "Unassigned") {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, updates.owner.toLowerCase().trim()))
        .limit(1);
      if (userResult.length > 0) {
        updatedUserId = userResult[0].id;
      }
    }

    const updated = await this.repo.update(id, {
      ...(updates.task ? { task: updates.task } : {}),
      ...(updates.owner !== undefined ? { owner: updates.owner || "Unassigned" } : {}),
      ...(updatedUserId !== undefined ? { userId: updatedUserId } : {}),
      ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate || "Not specified" } : {}),
      ...(updates.priority ? { priority: updates.priority } : {}),
      ...(updates.status ? { status: updates.status } : {}),
    });

    if (updated) {
      await indexActionItemMemory(updated);
    }
    if (userEmail) {
      invalidateCache.dashboard(userEmail);
    }

    return updated;
  }

  async deleteItem(id: string, userEmail?: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) return null;

    await deleteUserMemoryBySource(id);
    if (userEmail) {
      invalidateCache.dashboard(userEmail);
    }

    return deleted;
  }
}

export const actionItemsService = new ActionItemsService();
