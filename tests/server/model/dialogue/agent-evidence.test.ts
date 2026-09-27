import {
  agentEvidenceFingerprint,
  getAgentEvidenceSources,
  runIndependentAgentTasks,
} from "@/server/model/dialogue/orchestrator/agent-evidence";
import {
  emotionAgentInputSchema,
  navigationAgentInputSchema,
} from "@/server/model/dialogue/types/agent-results";

describe("adaptive downstream agent evidence", () => {
  it("changes its fingerprint whenever an evidence source changes", () => {
    const first = agentEvidenceFingerprint({
      codeReviewResult: "存在边界问题",
      studentProfileSummary: "数组较薄弱",
    });
    const second = agentEvidenceFingerprint({
      codeReviewResult: "存在空指针问题",
      studentProfileSummary: "数组较薄弱",
    });

    expect(first).not.toBe(second);
    expect(
      getAgentEvidenceSources({ studentProfileSummary: "数组较薄弱" }),
    ).toEqual(["student-profile"]);
  });

  it("allows either review, profile, or dialogue evidence", () => {
    expect(
      emotionAgentInputSchema.safeParse({
        sessionContext: [{ role: "user", content: "我卡住了" }],
      }).success,
    ).toBe(true);
    expect(
      navigationAgentInputSchema.safeParse({
        studentProfileSummary: "薄弱知识点：数组",
        knowledgeGraph: "数组 -> 边界检查",
      }).success,
    ).toBe(true);
    expect(
      navigationAgentInputSchema.safeParse({
        knowledgeGraph: "数组 -> 边界检查",
      }).success,
    ).toBe(false);
  });

  it("starts emotion and navigation without waiting for each other", async () => {
    const started: string[] = [];
    let releaseEmotion!: () => void;
    let releaseNavigation!: () => void;
    const emotionGate = new Promise<void>((resolve) => {
      releaseEmotion = resolve;
    });
    const navigationGate = new Promise<void>((resolve) => {
      releaseNavigation = resolve;
    });

    const pending = runIndependentAgentTasks({
      emotion: async () => {
        started.push("emotion");
        await emotionGate;
        return "emotion-result";
      },
      navigation: async () => {
        started.push("navigation");
        await navigationGate;
        return "navigation-result";
      },
    });

    await Promise.resolve();
    expect(started).toEqual(["emotion", "navigation"]);
    releaseEmotion();
    releaseNavigation();

    await expect(pending).resolves.toEqual({
      emotion: { status: "fulfilled", value: "emotion-result" },
      navigation: { status: "fulfilled", value: "navigation-result" },
    });
  });

  it("isolates an optional agent failure", async () => {
    const result = await runIndependentAgentTasks({
      emotion: async () => {
        throw new Error("emotion unavailable");
      },
      navigation: async () => "navigation-result",
    });

    expect(result.emotion?.status).toBe("rejected");
    expect(result.navigation).toEqual({
      status: "fulfilled",
      value: "navigation-result",
    });
  });
});
