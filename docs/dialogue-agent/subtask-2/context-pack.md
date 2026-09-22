# Subtask 2 — Context Pack

## 交付物

- `prisma/schema.prisma`（修改：新增 ChatSession + ChatMessage 模型，User 追加 chatSessions 关系字段）
- `src/server/model/dialogue/memory/session-store.ts` — SessionStore 接口 + InMemorySessionStore + createChatMessage
- `src/server/model/dialogue/memory/db-session-store.ts` — DbSessionStore（Prisma，容错降级）
- `src/server/model/dialogue/memory/dual-session-store.ts` — DualSessionStore（内存优先 + DB 双写）
- `src/server/model/dialogue/memory/context-trimmer.ts` — ContextTrimmer + TrimOptions + TrimmedContext
- `src/server/model/dialogue/memory/index.ts` — 统一 re-export
- `tests/server/model/dialogue/session-store.test.ts` — 12 测试
- `tests/server/model/dialogue/context-trimmer.test.ts` — 13 测试
- `tests/server/model/dialogue/dual-session-store.test.ts` — 12 测试

## 关键设计决策

1. **DualSessionStore 缓存策略**：内存优先读取 → 未命中读 DB → 回填内存；写操作双写，DB 失败不阻断内存（降级容错）
2. **ContextTrimmer 降级**：LLM 摘要调用包裹 try-catch，失败时回退为文本摘要（`fallbackSummary`），不中断会话
3. **Agent 专属过滤**：codeAgent 保留含代码块消息，emotionAgent 保留 user 消息，navigationAgent 保留全部
4. **Prisma 映射**：sessionId↔id, timestamp(number)↔DateTime, sessionState/metadata↔Json，使用 `as never` 处理 Json 输入类型
5. **setSession 方法**：InMemorySessionStore 提供 setSession 用于 DualSessionStore 缓存 DB 会话，创建副本保证不可变性

## 验证结果

- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue`：54/54 通过（5 套件，含 Subtask 1 的 17 测试）
- `git diff prisma/schema.prisma`：仅新增 2 模型 + User 追加 1 行，无原有字段改动
- 原有 3 个 Agent 零改动

## 后续子任务依赖关系

- Subtask 3（意图识别）：使用 shared/llm-client，不直接依赖 memory
- Subtask 5（学生画像）：使用 memory 的 SessionStore 存储画像相关会话状态
- Subtask 6（编排器）：调用 DualSessionStore 管理会话，调用 ContextTrimmer 裁剪上下文传给底层 Agent
