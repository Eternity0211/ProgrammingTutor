import { describe, expect, it } from "@jest/globals";
import {
  critiqueDialogueResult,
  enforceDialogueQualityGate,
  planDialogue,
  verifyDialogueResult,
} from "@/server/model/dialogue/orchestrator/agent-pipeline";

describe("planner critic verifier pipeline", () => {
  it("plans code review with optional emotional support", () => {
    const plan = planDialogue("CODE_SUBMISSION");
    expect(plan.steps.map((step) => step.agent)).toEqual(["code-review", "emotion"]);
  });

  it("critic catches missing required RAG output", () => {
    const critique = critiqueDialogueResult({ reply: "回答" }, planDialogue("KNOWLEDGE_QUESTION"));
    expect(critique.approved).toBe(false);
    expect(critique.issues[0]).toContain("rag");
  });

  it("verifier accepts a bounded response", () => {
    expect(verifyDialogueResult({ reply: "可以继续练习", agentResults: undefined }).valid).toBe(true);
  });

  it("rejects an ungrounded code review response", () => {
    const gated = enforceDialogueQualityGate(
      { reply: "看起来代码没有问题" },
      planDialogue("CODE_SUBMISSION"),
    );

    expect(gated.accepted).toBe(false);
    expect(gated.issues[0]).toContain("code-review");
    expect(gated.result.reply).toContain("可靠证据");
  });

  it("accepts a result containing the required planned output", () => {
    const gated = enforceDialogueQualityGate(
      {
        reply: "存在空指针问题",
        agentResults: {
          codeReview: {
            reviewSummary: "空指针",
            causalAnalysis: "指针没有初始化",
            suggestions: ["初始化指针"],
            confidence: 0.9,
          },
        },
      },
      planDialogue("CODE_SUBMISSION"),
    );

    expect(gated.accepted).toBe(true);
  });
});
