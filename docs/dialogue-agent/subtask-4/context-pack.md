# Subtask 4 — Context Pack

## 交付物

- `src/server/model/dialogue/rag/knowledge-store.ts` — KnowledgeStore 类 + cosineSimilarity 函数
- `src/server/model/dialogue/rag/rag-engine.ts` — RagEngine 类
- `src/server/model/dialogue/rag/index.ts` — 统一 re-export
- `tests/server/model/dialogue/knowledge-store.test.ts` — 12 测试
- `tests/server/model/dialogue/rag-engine.test.ts` — 11 测试

## 关键设计决策

1. **余弦相似度**：导出独立函数 `cosineSimilarity(a, b)`，范围 [-1, 1]，空向量/长度不等返回 0
2. **KnowledgeStore**：内存存储文档 + 嵌入向量 Map；`addDocument` 调用 LLM 生成嵌入；`search` 生成查询向量 → 余弦排序 → topK（默认 3）；空库 search 不调用 LLM
3. **RagEngine 降级策略**：空库/最高分 < scoreThreshold(0.3)/嵌入API失败 → degraded=true，LLM 原生知识回答；LLM 回答失败 → 兜底文案；`answer()` 永不抛异常
4. **非降级路径**：检索文档作为上下文注入 system prompt，要求 LLM 基于知识库回答
5. **addKnowledge 便捷方法**：自动生成 randomUUID 作为文档 ID，调用 store.addDocument
6. **getStore() 暴露**：供编排器预加载知识或检查库大小

## 降级矩阵

| 场景          | degraded | sources      | answer 来源        |
| ------------- | -------- | ------------ | ------------------ |
| 空库          | true     | []           | LLM 原生知识       |
| 最高分 < 0.3  | true     | []           | LLM 原生知识       |
| 嵌入 API 失败 | true     | []           | LLM 原生知识       |
| LLM 回答失败  | true     | []           | 兜底文案           |
| 正常检索      | false    | 检索到的文档 | LLM 基于知识库回答 |

## 验证结果

- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue --runInBand`：96/96 通过（8 套件，含 Subtask 1-3 的 73 测试 + Subtask 4 的 23 测试）
- 原有 3 个 Agent 零改动
- 未修改 .env / prisma/schema.prisma
- 未引入新 npm 依赖

## 后续子任务依赖关系

- Subtask 6（编排器）：意图为 `KNOWLEDGE_QUESTION` 时调用 `ragEngine.answer(question)`，返回 `RagResponse`
- 编排器可通过 `ragEngine.getStore()` 或 `ragEngine.addKnowledge()` 预加载知识文档
