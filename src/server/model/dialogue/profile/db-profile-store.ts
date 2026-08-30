import { prisma } from "@/lib/prisma";
import type { StudentProfile } from "../types";
import type { ProfileStore } from "./profile-store";

export class DbProfileStore implements ProfileStore {
  async getProfile(userId: string): Promise<StudentProfile | null> {
    try {
      const dbProfile = await prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (!dbProfile) return null;
      return this.mapProfile(dbProfile);
    } catch (error) {
      console.warn("[DbProfileStore] getProfile failed:", error);
      return null;
    }
  }

  async createProfile(userId: string): Promise<StudentProfile> {
    try {
      const dbProfile = await prisma.studentProfile.create({
        data: { userId },
      });
      return this.mapProfile(dbProfile);
    } catch (error) {
      console.warn("[DbProfileStore] createProfile failed:", error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    try {
      const dbProfile = await prisma.studentProfile.update({
        where: { userId },
        data: {
          ...(updates.codeSubmissionRecords !== undefined && {
            codeSubmissionRecords: updates.codeSubmissionRecords as never,
          }),
          ...(updates.weakKnowledgePoints !== undefined && {
            weakKnowledgePoints: updates.weakKnowledgePoints,
          }),
          ...(updates.emotionStats !== undefined && {
            emotionStats: updates.emotionStats as never,
          }),
        },
      });
      return this.mapProfile(dbProfile);
    } catch (error) {
      console.warn("[DbProfileStore] updateProfile failed:", error);
      throw error;
    }
  }

  async upsertProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    try {
      const dbProfile = await prisma.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...(updates.codeSubmissionRecords && {
            codeSubmissionRecords: updates.codeSubmissionRecords as never,
          }),
          ...(updates.weakKnowledgePoints && {
            weakKnowledgePoints: updates.weakKnowledgePoints,
          }),
          ...(updates.emotionStats && {
            emotionStats: updates.emotionStats as never,
          }),
        },
        update: {
          ...(updates.codeSubmissionRecords && {
            codeSubmissionRecords: updates.codeSubmissionRecords as never,
          }),
          ...(updates.weakKnowledgePoints && {
            weakKnowledgePoints: updates.weakKnowledgePoints,
          }),
          ...(updates.emotionStats && {
            emotionStats: updates.emotionStats as never,
          }),
        },
      });
      return this.mapProfile(dbProfile);
    } catch (error) {
      console.warn("[DbProfileStore] upsertProfile failed:", error);
      throw error;
    }
  }

  private mapProfile(db: any): StudentProfile {
    return {
      userId: db.userId,
      codeSubmissionRecords: db.codeSubmissionRecords ?? [],
      weakKnowledgePoints: db.weakKnowledgePoints ?? [],
      emotionStats: db.emotionStats ?? [],
      updatedAt:
        db.updatedAt instanceof Date
          ? db.updatedAt.getTime()
          : Number(db.updatedAt),
    };
  }
}
