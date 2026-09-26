import type { DialogueIntent } from "../types";
import type { DialogueNodeResult } from "./dialogue-state";

export interface PlanStep {
  agent: "code-review" | "emotion" | "navigation" | "rag" | "direct";
  purpose: string;
  required: boolean;
}

export interface DialoguePlan {
  intent: DialogueIntent;
  steps: PlanStep[];
}

export interface Critique {
  approved: boolean;
  issues: string[];
}

export interface VerificationResult {
  valid: boolean;
  issues: string[];
}

export function planDialogue(intent: DialogueIntent): DialoguePlan {
  switch (intent) {
    case "CODE_SUBMISSION":
      return { intent, steps: [{ agent: "code-review", purpose: "分析代码并给出可执行反馈", required: true }, { agent: "emotion", purpose: "识别学习情绪并提供支持", required: false }] };
    case "LEARNING_PATH_INQUIRY":
      return { intent, steps: [{ agent: "navigation", purpose: "生成个性化学习路径", required: true }, { agent: "rag", purpose: "补充课程知识来源", required: false }] };
    case "KNOWLEDGE_QUESTION":
      return { intent, steps: [{ agent: "rag", purpose: "检索知识并回答问题", required: true }] };
    default:
      return { intent, steps: [{ agent: "direct", purpose: "直接回答当前对话", required: true }] };
  }
}

export function critiqueDialogueResult(result: DialogueNodeResult | undefined, plan: DialoguePlan): Critique {
  const issues: string[] = [];
  if (!result?.reply?.trim()) issues.push("回复内容为空");
  for (const step of plan.steps.filter((item) => item.required)) {
    if (step.agent === "code-review" && !result?.agentResults?.codeReview) {
      issues.push("计划要求代码审查结果，但结果中缺少 code-review 输出");
    }
    if (step.agent === "navigation" && !result?.agentResults?.navigation) {
      issues.push("计划要求学习导航结果，但结果中缺少 navigation 输出");
    }
    if (step.agent === "rag" && !result?.agentResults?.rag) {
      issues.push("计划要求知识检索结果，但结果中缺少 rag 输出");
    }
  }
  return { approved: issues.length === 0, issues };
}

export function verifyDialogueResult(result: DialogueNodeResult | undefined): VerificationResult {
  const issues: string[] = [];
  if (!result) issues.push("缺少编排结果");
  else if (result.reply.length > 20_000) issues.push("回复超过 20000 字符限制");
  return { valid: issues.length === 0, issues };
}

export interface DialogueQualityGateResult {
  accepted: boolean;
  issues: string[];
  result: DialogueNodeResult;
}

export function enforceDialogueQualityGate(
  result: DialogueNodeResult | undefined,
  plan: DialoguePlan,
): DialogueQualityGateResult {
  const critique = critiqueDialogueResult(result, plan);
  const verification = verifyDialogueResult(result);
  const issues = [...critique.issues, ...verification.issues];
  if (issues.length === 0 && result) {
    return { accepted: true, issues, result };
  }

  return {
    accepted: false,
    issues,
    result: {
      reply:
        "当前缺少完成本次分析所需的可靠证据，请先运行代码测试或补充提交信息后重试。",
      agentResults: result?.agentResults,
      sessionStateUpdate: result?.sessionStateUpdate,
    },
  };
}
