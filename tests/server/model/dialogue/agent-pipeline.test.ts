import { describe, expect, it } from "@jest/globals";
import { critiqueDialogueResult, planDialogue, verifyDialogueResult } from "@/server/model/dialogue/orchestrator/agent-pipeline";

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
});
