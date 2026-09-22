# Subtask 6 — Context Pack

## 交付物

- `src/server/model/dialogue/types/session.ts` — SessionState 最小化（移除 lastAgentResults，新增 lastCodeReview）
- `src/server/model/dialogue/types/dialogue.ts` — 扩展 DialogueRequestContext + 修复 rag.sources 类型
- `src/server/model/dialogue/orchestrator/dialogue-orchestrator.ts` — DialogueOrchestrator 类
- `src/server/model/dialogue/orchestrator/index.ts` — 统一 re-export
- `tests/server/model/dialogue/dialogue-orchestrator.test.ts` — 17 测试

## 关键设计决策

1. **SessionState 最小化**：移除 `lastAgentResults`（完整快照），仅保留 `lastCodeReview: { reviewSummary: string }` 供 emotionAgent/navigationAgent 使用
2. **DialogueRequestContext 扩展**：新增 `code`/`symbolic: SymbolicResult`/`testSummary`/`codeReviewResult`，`symbolic` 使用具体类型而非 `unknown`
3. **rag.sources 类型修复**：从 `string[]` 改为 `KnowledgeDocument[]`，与 RagResponse 一致
4. **意图识别失败兜底**：recognize() 抛异常 → catch → 路由到 `THOUGHT_FOLLOWUP`
5. **Agent 调用用 `as` 强制转换**：保留全部原入参 + 追加 `studentProfileSummary`/`sessionContext`，不修改 Agent 源文件
6. **5 个意图路由处理器**：
   - CODE_SUBMISSION: 有 symbolic+testSummary → codeAgent+emotionAgent；无 → LLM
   - EMOTIONAL_VENTING: 有 lastCodeReview → emotionAgent；无 → LLM
   - LEARNING_PATH_INQUIRY: 有 lastCodeReview → navigationAgent；无 → LLM
   - KNOWLEDGE_QUESTION: 始终 → ragEngine.answer()
   - THOUGHT_FOLLOWUP: LLM + 上下文续写
7. **chat() 永不抛异常**：Agent 失败 → LLM 降级；LLM 失败 → 兜底文案；fatal error → 兜底响应
8. **sessionState 序列化**：`lastCodeReview` 作为结构化对象存入 Prisma Json 字段，自动序列化/反序列化
9. **jest.mock 用 factory 函数**：避免加载 emotionAgent 的 `import.meta.url` 语法；用相对路径 `../../../../src/...` 绕过 `@/` 别名在 jest.mock 中不生效的问题

## 验证结果

- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue --runInBand`：135/135 通过（11 套件，含 Subtask 1-5 的 118 测试 + Subtask 6 的 17 测试）
- 原有 3 个 Agent 源文件零改动
- 未修改 .env
- 未引入新 npm 依赖

## 后续子任务依赖关系

- Subtask 7（API 路由 & 前端集成）：创建 Next.js API route 调用 `orchestrator.chat(request)`，前端对接对话 UI
