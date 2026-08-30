import { InMemoryProfileStore } from "@/server/model/dialogue/profile/profile-store";
import type { StudentProfile } from "@/server/model/dialogue/types";

describe("InMemoryProfileStore", () => {
  let store: InMemoryProfileStore;

  beforeEach(() => {
    store = new InMemoryProfileStore();
  });

  it("should return null for non-existent profile", async () => {
    const profile = await store.getProfile("user-1");
    expect(profile).toBeNull();
  });

  it("should create an empty profile", async () => {
    const profile = await store.createProfile("user-1");
    expect(profile.userId).toBe("user-1");
    expect(profile.codeSubmissionRecords).toEqual([]);
    expect(profile.weakKnowledgePoints).toEqual([]);
    expect(profile.emotionStats).toEqual([]);
    expect(profile.updatedAt).toBeGreaterThan(0);
  });

  it("should update profile with merges", async () => {
    await store.createProfile("user-1");
    const updated = await store.updateProfile("user-1", {
      weakKnowledgePoints: ["指针", "递归"],
    });
    expect(updated.weakKnowledgePoints).toEqual(["指针", "递归"]);
    expect(updated.codeSubmissionRecords).toEqual([]);
    expect(updated.updatedAt).toBeGreaterThan(0);
  });

  it("should throw when updating non-existent profile", async () => {
    await expect(store.updateProfile("user-1", {})).rejects.toThrow();
  });

  it("should upsert (create) when profile does not exist", async () => {
    const profile = await store.upsertProfile("user-1", {
      weakKnowledgePoints: ["指针"],
    });
    expect(profile.userId).toBe("user-1");
    expect(profile.weakKnowledgePoints).toEqual(["指针"]);
  });

  it("should upsert (update) when profile exists", async () => {
    await store.createProfile("user-1");
    await store.updateProfile("user-1", {
      weakKnowledgePoints: ["指针"],
    });
    const profile = await store.upsertProfile("user-1", {
      emotionStats: [
        { emotion: "挫败", count: 1, lastIntensity: "强", lastTimestamp: 0 },
      ],
    });
    expect(profile.weakKnowledgePoints).toEqual(["指针"]);
    expect(profile.emotionStats).toHaveLength(1);
  });

  it("should return existing profile via getProfile", async () => {
    await store.createProfile("user-1");
    const profile = await store.getProfile("user-1");
    expect(profile).not.toBeNull();
    expect(profile!.userId).toBe("user-1");
  });

  it("should set profile directly via setProfile", async () => {
    const profile: StudentProfile = {
      userId: "user-1",
      codeSubmissionRecords: [
        { questionId: "q1", score: 80, concepts: ["指针"], timestamp: 1000 },
      ],
      weakKnowledgePoints: ["指针"],
      emotionStats: [],
      updatedAt: 1000,
    };
    store.setProfile(profile);
    const retrieved = await store.getProfile("user-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.codeSubmissionRecords).toHaveLength(1);
  });

  it("should not mutate stored profile when modifying retrieved profile", async () => {
    await store.createProfile("user-1");
    const profile = await store.getProfile("user-1");
    profile!.weakKnowledgePoints.push("指针");
    const stored = await store.getProfile("user-1");
    expect(stored!.weakKnowledgePoints).toEqual([]);
  });
});
