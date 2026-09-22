# Subtask 2 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/memory/` — 会话记忆与上下文裁剪

## 入口文件

- 会话存储：`import { DualSessionStore, DbSessionStore, InMemorySessionStore, createChatMessage } from "@/server/model/dialogue/memory"`
- 上下文裁剪：`import { ContextTrimmer, type TrimOptions, type TrimmedContext } from "@/server/model/dialogue/memory"`

## 快速使用示例

```typescript
import {
  DualSessionStore,
  DbSessionStore,
  createChatMessage,
} from "@/server/model/dialogue/memory";
import { ContextTrimmer } from "@/server/model/dialogue/memory";

// 创建双存储会话
const store = new DualSessionStore(new DbSessionStore());
const session = await store.createSession("user-1");

// 添加消息
const msg = createChatMessage("user", "我的代码有指针错误");
await store.addMessage(session.sessionId, msg);

// 获取完整历史（给前端）
const history = await store.getMessages(session.sessionId);

// 裁剪上下文（给底层 Agent）
const trimmer = new ContextTrimmer();
const trimmed = await trimmer.trimForAgent(history, {
  maxMessages: 6,
  agentType: "codeAgent",
});
// trimmed.recentMessages → 最多 6 条含代码的消息
// trimmed.summary → 旧消息摘要（LLM 失败时降级为文本摘要）
// trimmed.extractedFields.codeBlocks → 提取的代码块
```

## 下一步

Subtask 3: 意图识别模块 — LLM 分类器区分 5 类意图，返回结构化 IntentRecognitionResult。
