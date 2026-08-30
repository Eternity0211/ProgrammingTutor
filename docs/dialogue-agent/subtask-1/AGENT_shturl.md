# Subtask 1 — Agent Shortcut

## 模块定位
`src/server/model/dialogue/` — 学生对话答疑 Agent 系统根目录

## 入口文件
- 类型导入：`import { ... } from "@/server/model/dialogue/types"`
- LLM 调用：`import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client"`
- 链路日志：`import { TraceLogger } from "@/server/model/dialogue/shared/trace-logger"`

## 快速使用示例
```typescript
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";
import { TraceLogger } from "@/server/model/dialogue/shared/trace-logger";
import type { DialogueIntent } from "@/server/model/dialogue/types";

const llm = DialogueLlmClient.getInstance();
const tracer = new TraceLogger(undefined, "session-1", "user-1");

const spanId = tracer.startSpan("llm-call");
const reply = await llm.chatCompletion({
  messages: [{ role: "user", content: "你好" }],
  jsonMode: false,
});
tracer.endSpan(spanId, { replyLength: reply.length });
tracer.flush();
```

## 下一步
Subtask 2: 会话记忆 & 上下文裁剪 — 基于 types/session.ts 和 shared/ 基础设施构建内存+DB 双存储会话管理。
