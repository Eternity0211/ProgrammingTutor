import type { AgentResultSnapshot, StudentProfile } from "../types";
import type { ProfileStore } from "./profile-store";
import { InMemoryProfileStore } from "./profile-store";

const PROGRAMMING_CONCEPTS = [
  "指针", "引用", "内存", "递归", "循环", "数组", "链表", "树", "图",
  "排序", "查找", "动态规划", "贪心", "面向对象", "继承", "多态", "封装",
  "异常", "模板", "STL", "容器", "迭代器", "lambda", "函数", "变量",
  "作用域", "构造", "析构", "虚函数", "纯虚", "友元", "运算符重载",
];

export class ProfileUpdater {
  private store: ProfileStore;

  constructor(store?: ProfileStore) {
    this.store = store ?? new InMemoryProfileStore();
  }

  async updateFromAgentResults(
    userId: string,
    agentResults: AgentResultSnapshot,
    context?: { questionId?: string; score?: number },
  ): Promise<StudentProfile> {
    try {
      const profile = await this.store.upsertProfile(userId, {});

      if (agentResults.codeReview && context?.questionId) {
        const text = [
          agentResults.codeReview.reviewSummary,
          agentResults.codeReview.causalAnalysis,
          ...agentResults.codeReview.suggestions,
        ].join(" ");
        const concepts = PROGRAMMING_CONCEPTS.filter((c) =>
          text.includes(c),
        );
        const score =
          context.score ?? agentResults.codeReview.confidence * 100;

        profile.codeSubmissionRecords.push({
          questionId: context.questionId,
          score,
          concepts,
          timestamp: Date.now(),
        });
      }

      if (agentResults.emotion) {
        const { detected_emotion, intensity } = agentResults.emotion;
        const existing = profile.emotionStats.find(
          (e) => e.emotion === detected_emotion,
        );
        if (existing) {
          existing.count++;
          existing.lastIntensity = intensity;
          existing.lastTimestamp = Date.now();
        } else {
          profile.emotionStats.push({
            emotion: detected_emotion,
            count: 1,
            lastIntensity: intensity,
            lastTimestamp: Date.now(),
          });
        }
      }

      if (agentResults.navigation) {
        for (const weakness of agentResults.navigation.weaknesses) {
          if (!profile.weakKnowledgePoints.includes(weakness)) {
            profile.weakKnowledgePoints.push(weakness);
          }
        }
      }

      return await this.store.updateProfile(userId, {
        codeSubmissionRecords: profile.codeSubmissionRecords,
        emotionStats: profile.emotionStats,
        weakKnowledgePoints: profile.weakKnowledgePoints,
      });
    } catch (error) {
      console.warn("[ProfileUpdater] updateFromAgentResults failed:", error);
      return {
        userId,
        codeSubmissionRecords: [],
        weakKnowledgePoints: [],
        emotionStats: [],
        updatedAt: Date.now(),
      };
    }
  }

  summarizeForContext(profile: StudentProfile | null): string {
    if (!profile) return "暂无学生画像数据";

    const parts: string[] = [];

    if (profile.codeSubmissionRecords.length > 0) {
      const records = profile.codeSubmissionRecords;
      const count = records.length;
      const avgScore = records.reduce((sum, r) => sum + r.score, 0) / count;
      parts.push(
        `该学生近期提交了${count}次代码，平均分${avgScore.toFixed(1)}分`,
      );
    }

    if (profile.weakKnowledgePoints.length > 0) {
      parts.push(`薄弱知识点：${profile.weakKnowledgePoints.join("、")}`);
    }

    if (profile.emotionStats.length > 0) {
      const emotionText = profile.emotionStats
        .map((e) => `${e.emotion}(${e.count}次,${e.lastIntensity})`)
        .join("、");
      parts.push(`近期情绪：${emotionText}`);
    }

    if (parts.length === 0) return "暂无学生画像数据";

    return parts.join("，");
  }
}
