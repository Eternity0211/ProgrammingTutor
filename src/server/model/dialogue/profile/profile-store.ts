import type { StudentProfile } from "../types";

export interface ProfileStore {
  getProfile(userId: string): Promise<StudentProfile | null>;
  createProfile(userId: string): Promise<StudentProfile>;
  updateProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile>;
  upsertProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile>;
}

export class InMemoryProfileStore implements ProfileStore {
  private profiles = new Map<string, StudentProfile>();

  async getProfile(userId: string): Promise<StudentProfile | null> {
    const profile = this.profiles.get(userId);
    if (!profile) return null;
    return {
      ...profile,
      codeSubmissionRecords: [...profile.codeSubmissionRecords],
      weakKnowledgePoints: [...profile.weakKnowledgePoints],
      emotionStats: [...profile.emotionStats],
    };
  }

  async createProfile(userId: string): Promise<StudentProfile> {
    const profile: StudentProfile = {
      userId,
      codeSubmissionRecords: [],
      weakKnowledgePoints: [],
      emotionStats: [],
      updatedAt: Date.now(),
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    const existing = this.profiles.get(userId);
    if (!existing) {
      throw new Error(`Profile not found for userId: ${userId}`);
    }
    const updated: StudentProfile = {
      ...existing,
      ...updates,
      userId: existing.userId,
      updatedAt: Date.now(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  async upsertProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    const existing = this.profiles.get(userId);
    if (!existing) {
      await this.createProfile(userId);
    }
    return this.updateProfile(userId, updates);
  }

  setProfile(profile: StudentProfile): void {
    this.profiles.set(profile.userId, {
      ...profile,
      codeSubmissionRecords: [...profile.codeSubmissionRecords],
      weakKnowledgePoints: [...profile.weakKnowledgePoints],
      emotionStats: [...profile.emotionStats],
    });
  }
}
