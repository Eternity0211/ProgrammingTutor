import type { StudentProfile } from "../types";
import type { ProfileStore } from "./profile-store";
import { InMemoryProfileStore } from "./profile-store";

export class DualProfileStore implements ProfileStore {
  private memory: InMemoryProfileStore;
  private db: ProfileStore;

  constructor(db: ProfileStore) {
    this.memory = new InMemoryProfileStore();
    this.db = db;
  }

  async getProfile(userId: string): Promise<StudentProfile | null> {
    const cached = await this.memory.getProfile(userId);
    if (cached) return cached;

    try {
      const dbProfile = await this.db.getProfile(userId);
      if (dbProfile) {
        this.memory.setProfile(dbProfile);
      }
      return dbProfile;
    } catch (error) {
      console.warn("[DualProfileStore] DB getProfile failed:", error);
      return null;
    }
  }

  async createProfile(userId: string): Promise<StudentProfile> {
    let profile: StudentProfile;
    try {
      profile = await this.db.createProfile(userId);
    } catch (error) {
      console.warn(
        "[DualProfileStore] DB createProfile failed, using memory only:",
        error,
      );
      profile = await this.memory.createProfile(userId);
    }
    this.memory.setProfile(profile);
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    const updated = await this.memory.updateProfile(userId, updates);
    try {
      await this.db.updateProfile(userId, updates);
    } catch (error) {
      console.warn("[DualProfileStore] DB updateProfile failed:", error);
    }
    return updated;
  }

  async upsertProfile(
    userId: string,
    updates: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    let profile: StudentProfile;
    try {
      profile = await this.db.upsertProfile(userId, updates);
    } catch (error) {
      console.warn(
        "[DualProfileStore] DB upsertProfile failed, using memory only:",
        error,
      );
      profile = await this.memory.upsertProfile(userId, updates);
    }
    this.memory.setProfile(profile);
    return profile;
  }
}
