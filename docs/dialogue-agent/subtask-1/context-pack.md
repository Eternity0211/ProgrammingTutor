# Subtask 1 — Context Pack

## 交付物
- `src/server/model/dialogue/types/intent.ts` — 5 类意图枚举 + 意图识别结果接口
- `src/server/model/dialogue/types/session.ts` — 会话记忆类型（ChatMessage/ChatSession/SessionState/AgentResultSnapshot）
- `src/server/model/dialogue/types/profile.ts` — 学生画像类型（StudentProfile/CodeSubmissionRecord/EmotionStat）
- `src/server/model/dialogue/types/rag.ts` — RAG 检索类型（KnowledgeDocument/RetrievalResult/RagResponse）
- `src/server/model/dialogue/types/trace.ts` — 链路日志类型（TraceLevel/TraceEvent/TraceSpan/TraceContext）
- `src/server/model/dialogue/types/dialogue.ts` — 对话总线类型（DialogueRequest/DialogueResponse）
- `src/server/model/dialogue/types/index.ts` — 统一 re-export
- `src/server/model/dialogue/shared/llm-client.ts` — 共享 LLM 客户端（单例 DashScope，chatCompletion + createEmbedding）
- `src/server/model/dialogue/shared/trace-logger.ts` — 链路日志（TraceLogger 类）
- `tests/server/model/dialogue/trace-logger.test.ts` — 10 个测试
- `tests/server/model/dialogue/llm-client.test.ts` — 7 个测试

## 关键设计决策
1. **DialogueLlmClient 单例**：复用 DASHSCOPE_API_KEY + DashScope baseURL，chatCompletion 和 createEmbedding 共用同一 OpenAI 实例
2. **类型对齐**：AgentResultSnapshot 的字段名与现有 3 个 Agent 输出结构完全对齐（emotion_analysis → emotion, learning_navigation → navigation）
3. **TraceLogger 零依赖**：纯 crypto.randomUUID + Date.now，内存缓冲，flush 输出结构化 JSON
4. **resetInstance()**：DialogueLlmClient 提供 resetInstance 静态方法用于测试隔离

## 验证结果
- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue`：17/17 通过
- `git status`：仅新增文件，原有 Agent 零改动

## 后续子任务依赖关系
- Subtask 2（会话记忆）：依赖 types/session.ts、shared/llm-client.ts、shared/trace-logger.ts
- Subtask 3（意图识别）：依赖 types/intent.ts、shared/llm-client.ts
- Subtask 4（RAG）：依赖 types/rag.ts、shared/llm-client.ts（createEmbedding）
- Subtask 5（学生画像）：依赖 types/profile.ts、types/session.ts
- Subtask 6（编排器）：依赖全部上述类型 + shared 基础设施
