import { ProfileUpdater } from "@/server/model/dialogue/profile/profile-updater";
import { InMemoryProfileStore } from "@/server/model/dialogue/profile/profile-store";
import type { AgentResultSnapshot } from "@/server/model/dialogue/types";

describe("ProfileUpdater", () => {
  let store: InMemoryProfileStore;
  let updater: ProfileUpdater;

  beforeEach(() => {
    store = new InMemoryProfileStore();
    updater = new ProfileUpdater(store);
  });

  const codeReview = {
    reviewSummary: "代码中指针使用有误",
    causalAnalysis: "对内存和指针的理解不足",
    suggestions: ["建议复习指针和内存相关知识"],
    confidence: 0.7,
  };

  const emotion = {
    detected_emotion: "挫败",
    intensity: "强" as const,
    reason: "多次提交未通过",
    supportive_guidance: "不要灰心",
  };

  const navigation = {
    weaknesses: ["指针", "递归"],
    learning_path: [],
    recommended_exercises: [],
  };

  it("should extract concepts from codeReview", async () => {
    const agentResults: AgentResultSnapshot = { codeReview };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
      { questionId: "q1", score: 60 },
    );
    expect(profile.codeSubmissionRecords).toHaveLength(1);
    expect(profile.codeSubmissionRecords[0].questionId).toBe("q1");
    expect(profile.codeSubmissionRecords[0].score).toBe(60);
    expect(profile.codeSubmissionRecords[0].concepts).toContain("指针");
    expect(profile.codeSubmissionRecords[0].concepts).toContain("内存");
  });

  it("should use confidence*100 as score when context.score is undefined", async () => {
    const agentResults: AgentResultSnapshot = { codeReview };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
      { questionId: "q1" },
    );
    expect(profile.codeSubmissionRecords[0].score).toBe(70);
  });

  it("should not add code submission record without questionId", async () => {
    const agentResults: AgentResultSnapshot = { codeReview };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
    );
    expect(profile.codeSubmissionRecords).toHaveLength(0);
  });

  it("should update emotion stats", async () => {
    const agentResults: AgentResultSnapshot = { emotion };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
    );
    expect(profile.emotionStats).toHaveLength(1);
    expect(profile.emotionStats[0].emotion).toBe("挫败");
    expect(profile.emotionStats[0].count).toBe(1);
    expect(profile.emotionStats[0].lastIntensity).toBe("强");
  });

  it("should increment count for repeated emotion", async () => {
    await updater.updateFromAgentResults("user-1", { emotion });
    const profile = await updater.updateFromAgentResults(
      "user-1",
      { emotion: { ...emotion, intensity: "中" as const } },
    );
    expect(profile.emotionStats).toHaveLength(1);
    expect(profile.emotionStats[0].count).toBe(2);
    expect(profile.emotionStats[0].lastIntensity).toBe("中");
  });

  it("should merge navigation weaknesses", async () => {
    const agentResults: AgentResultSnapshot = { navigation };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
    );
    expect(profile.weakKnowledgePoints).toEqual(["指针", "递归"]);
  });

  it("should deduplicate weaknesses on repeated update", async () => {
    await updater.updateFromAgentResults("user-1", { navigation });
    const profile = await updater.updateFromAgentResults(
      "user-1",
      { navigation: { ...navigation, weaknesses: ["指针", "数组"] } },
    );
    expect(profile.weakKnowledgePoints).toEqual(["指针", "递归", "数组"]);
  });

  it("should handle combined agent results", async () => {
    const agentResults: AgentResultSnapshot = {
      codeReview,
      emotion,
      navigation,
    };
    const profile = await updater.updateFromAgentResults(
      "user-1",
      agentResults,
      { questionId: "q1", score: 50 },
    );
    expect(profile.codeSubmissionRecords).toHaveLength(1);
    expect(profile.emotionStats).toHaveLength(1);
    expect(profile.weakKnowledgePoints).toHaveLength(2);
  });

  it("should summarize profile with full data", () => {
    const profile = {
      userId: "user-1",
      codeSubmissionRecords: [
        { questionId: "q1", score: 80, concepts: ["指针"], timestamp: 1000 },
        { questionId: "q2", score: 60, concepts: ["递归"], timestamp: 2000 },
      ],
      weakKnowledgePoints: ["指针", "递归"],
      emotionStats: [
        { emotion: "挫败", count: 3, lastIntensity: "强" as const, lastTimestamp: 3000 },
      ],
      updatedAt: 3000,
    };
    const summary = updater.summarizeForContext(profile);
    expect(summary).toContain("提交了2次代码");
    expect(summary).toContain("平均分70.0分");
    expect(summary).toContain("薄弱知识点：指针、递归");
    expect(summary).toContain("挫败(3次,强)");
  });

  it("should return default text for null profile", () => {
    const summary = updater.summarizeForContext(null);
    expect(summary).toBe("暂无学生画像数据");
  });

  it("should return default text for empty profile", () => {
    const profile = {
      userId: "user-1",
      codeSubmissionRecords: [],
      weakKnowledgePoints: [],
      emotionStats: [],
      updatedAt: 0,
    };
    const summary = updater.summarizeForContext(profile);
    expect(summary).toBe("暂无学生画像数据");
  });

  it("should summarize partial data (only submissions)", () => {
    const profile = {
      userId: "user-1",
      codeSubmissionRecords: [
        { questionId: "q1", score: 90, concepts: [], timestamp: 1000 },
      ],
      weakKnowledgePoints: [],
      emotionStats: [],
      updatedAt: 1000,
    };
    const summary = updater.summarizeForContext(profile);
    expect(summary).toContain("提交了1次代码");
    expect(summary).toContain("平均分90.0分");
    expect(summary).not.toContain("薄弱知识点");
    expect(summary).not.toContain("情绪");
  });

  it("should summarize partial data (only emotions)", () => {
    const profile = {
      userId: "user-1",
      codeSubmissionRecords: [],
      weakKnowledgePoints: [],
      emotionStats: [
        { emotion: "焦虑", count: 2, lastIntensity: "中" as const, lastTimestamp: 2000 },
      ],
      updatedAt: 2000,
    };
    const summary = updater.summarizeForContext(profile);
    expect(summary).toContain("焦虑(2次,中)");
    expect(summary).not.toContain("提交");
    expect(summary).not.toContain("薄弱知识点");
  });
});
