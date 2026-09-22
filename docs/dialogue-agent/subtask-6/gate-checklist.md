# Subtask 6 — Gate Checklist

## 代码完整性

- [x] types/session.ts（SessionState 最小化）
- [x] types/dialogue.ts（扩展 DialogueRequestContext + 修复 rag.sources）
- [x] orchestrator/dialogue-orchestrator.ts（DialogueOrchestrator 类）
- [x] orchestrator/index.ts 统一 re-export
- [x] dialogue-orchestrator.test.ts（17 测试）

## 类型安全

- [x] `npx tsc --noEmit` 零错误
- [x] symbolic 使用 SymbolicResult 类型（非 unknown）
- [x] rag.sources 使用 KnowledgeDocument[]（非 string[]）
- [x] chat() 返回值必定是 DialogueResponse

## 测试覆盖

- [x] CODE_SUBMISSION 有上下文 → codeAgent+emotionAgent 被调用（1 测试）
- [x] CODE_SUBMISSION 无上下文 → LLM 审查（1 测试）
- [x] CODE_SUBMISSION codeAgent 失败 → LLM 降级（1 测试）
- [x] EMOTIONAL_VENTING 有 lastCodeReview → emotionAgent 被调用（1 测试）
- [x] EMOTIONAL_VENTING 无 codeReviewResult → LLM 共情（1 测试）
- [x] LEARNING_PATH_INQUIRY 有 lastCodeReview → navigationAgent 被调用（1 测试）
- [x] LEARNING_PATH_INQUIRY 无 codeReviewResult → LLM 建议（1 测试）
- [x] KNOWLEDGE_QUESTION → ragEngine.answer 被调用（1 测试）
- [x] THOUGHT_FOLLOWUP → LLM 续写（1 测试）
- [x] 新建会话 → 返回新 sessionId（1 测试）
- [x] 复用会话 → 返回相同 sessionId（1 测试）
- [x] 意图识别失败 → 兜底 THOUGHT_FOLLOWUP（1 测试）
- [x] LLM 失败 → 兜底文案（1 测试）
- [x] 全部失败 → 兜底响应（1 测试）
- [x] sessionState 存储 lastCodeReview（1 测试）
- [x] 有 agentResults → profileUpdater 被调用（1 测试）
- [x] 无 agentResults → profileUpdater 不被调用（1 测试）

## 约束遵守

- [x] 未修改 codeAgent/emotionAgent/navigationAgent 源文件
- [x] Agent 调用使用 `as` 强制转换
- [x] Agent 调用保留全部原入参 + 追加新字段
- [x] 未修改 .env / .env.example
- [x] 未引入新 npm 依赖
- [x] chat() 永不抛异常
- [x] 意图识别失败兜底到 THOUGHT_FOLLOWUP
- [x] SessionState 只保留最小必要字段
