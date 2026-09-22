# Subtask 6 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/orchestrator/` — 对话编排器模块

## 入口文件

- 编排器：`import { DialogueOrchestrator } from "@/server/model/dialogue/orchestrator"`

## 快速使用示例

```typescript
import { DialogueOrchestrator } from "@/server/model/dialogue/orchestrator";

const orchestrator = new DialogueOrchestrator();

// 普通知识点提问
const response1 = await orchestrator.chat({
  userId: "user-1",
  message: "什么是指针？",
});
// response1.intent → "KNOWLEDGE_QUESTION"
// response1.reply → RAG/LLM 回答
// response1.agentResults?.rag → RAG 结果

// 代码提交（带评估上下文）
const response2 = await orchestrator.chat({
  userId: "user-1",
  message: "帮我看看代码",
  context: {
    code: "int *p = null; *p = 1;",
    language: "cpp",
    symbolic: { errors: [], warnings: [] },
    testSummary: { total: 3, passed: 1, failed: 2 },
    questionId: "q1",
  },
});
// response2.intent → "CODE_SUBMISSION"
// response2.agentResults?.codeReview → codeAgent 结果
// response2.agentResults?.emotion → emotionAgent 结果

// 后续情绪倾诉（复用会话）
const response3 = await orchestrator.chat({
  userId: "user-1",
  message: "我太难了",
  sessionId: response2.sessionId,
});
// response3.intent → "EMOTIONAL_VENTING"
// 从 sessionState.lastCodeReview 获取 codeReviewResult → 调用 emotionAgent
```

## 下一步

Subtask 7: API 路由 & 前端集成 — 创建 Next.js API route 接收前端请求，调用 orchestrator.chat()，前端实现对话 UI。
