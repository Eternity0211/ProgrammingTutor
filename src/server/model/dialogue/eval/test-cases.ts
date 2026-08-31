import type { EvalTestCase } from "./eval-types";

export const defaultTestCases: EvalTestCase[] = [
  {
    id: "kq-basic",
    name: "知识点提问 — 指针",
    input: { userId: "eval-user", message: "什么是指针？" },
    expected: { intent: "KNOWLEDGE_QUESTION" },
  },
  {
    id: "kq-degraded",
    name: "知识点提问 — RAG降级",
    input: { userId: "eval-user", message: "什么是递归？" },
    expected: { intent: "KNOWLEDGE_QUESTION", degraded: true },
  },
  {
    id: "cs-basic",
    name: "代码提交",
    input: { userId: "eval-user", message: "帮我看看代码" },
    expected: { intent: "CODE_SUBMISSION" },
  },
  {
    id: "cs-no-agent",
    name: "代码提交 — 无Agent结果",
    input: { userId: "eval-user", message: "帮我看看这段代码有什么问题" },
    expected: { intent: "CODE_SUBMISSION", hasAgentResults: false },
  },
  {
    id: "em-venting",
    name: "情绪倾诉",
    input: { userId: "eval-user", message: "我太难了" },
    expected: { intent: "EMOTIONAL_VENTING" },
  },
  {
    id: "lp-inquiry",
    name: "学习路径咨询",
    input: { userId: "eval-user", message: "下一步学什么" },
    expected: { intent: "LEARNING_PATH_INQUIRY" },
  },
  {
    id: "tf-followup",
    name: "思路追问",
    input: { userId: "eval-user", message: "继续说说刚才那个" },
    expected: { intent: "THOUGHT_FOLLOWUP", hasAgentResults: false },
  },
];
