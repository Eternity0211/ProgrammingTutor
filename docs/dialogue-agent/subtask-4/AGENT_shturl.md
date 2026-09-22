# Subtask 4 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/rag/` — RAG 知识库模块

## 入口文件

- RAG 引擎：`import { RagEngine } from "@/server/model/dialogue/rag"`
- 知识存储：`import { KnowledgeStore, cosineSimilarity } from "@/server/model/dialogue/rag"`

## 快速使用示例

```typescript
import { RagEngine } from "@/server/model/dialogue/rag";

const engine = new RagEngine();

// 预加载知识
await engine.addKnowledge("指针", "指针是变量的内存地址...", "textbook");
await engine.addKnowledge("递归", "递归是函数调用自身...", "textbook");

// 答疑（永不抛异常）
const response = await engine.answer("什么是指针");
// response.answer → LLM 基于知识库的回答
// response.sources → [KnowledgeDocument]（匹配到的文档）
// response.degraded → false（正常检索）

// 降级场景
const response2 = await engine.answer("什么是量子力学");
// response2.degraded → true（无匹配知识，LLM 原生知识回答）
// response2.sources → []
```

## 下一步

Subtask 5: 长期学生画像记忆 — 跨会话积累学生编程能力画像、情绪趋势、薄弱知识点，为编排器提供个性化上下文。
