# Subtask 4 — Gate Checklist

## 代码完整性

- [x] knowledge-store.ts（KnowledgeStore 类 + cosineSimilarity 函数）
- [x] rag-engine.ts（RagEngine 类）
- [x] index.ts 统一 re-export
- [x] knowledge-store.test.ts（12 测试）
- [x] rag-engine.test.ts（11 测试）

## 类型安全

- [x] `npx tsc --noEmit` 零错误
- [x] answer() 返回值必定是 RagResponse
- [x] search() 返回值必定是 RetrievalResult[]
- [x] cosineSimilarity 返回值必定是 number

## 测试覆盖

- [x] cosineSimilarity: 相同向量 → 1（1 测试）
- [x] cosineSimilarity: 正交向量 → 0（1 测试）
- [x] cosineSimilarity: 相反向量 → -1（1 测试）
- [x] cosineSimilarity: 空向量 → 0（1 测试）
- [x] cosineSimilarity: 长度不等 → 0（1 测试）
- [x] KnowledgeStore: addDocument + 生成嵌入（1 测试）
- [x] KnowledgeStore: search 排序（1 测试）
- [x] KnowledgeStore: 空库 search 返回空数组（1 测试）
- [x] KnowledgeStore: topK 限制（1 测试）
- [x] KnowledgeStore: clear 清空（1 测试）
- [x] KnowledgeStore: getDocuments 返回所有文档（1 测试）
- [x] KnowledgeStore: getDocuments 不可变性（1 测试）
- [x] RagEngine: 好检索非降级（1 测试）
- [x] RagEngine: 非降级时 prompt 包含知识库内容（1 测试）
- [x] RagEngine: 差检索降级（1 测试）
- [x] RagEngine: 降级时 prompt 不含知识库内容（1 测试）
- [x] RagEngine: 空库降级（1 测试）
- [x] RagEngine: 嵌入 API 失败降级（1 测试）
- [x] RagEngine: LLM 失败兜底文案（1 测试）
- [x] RagEngine: addKnowledge（1 测试）
- [x] RagEngine: 自定义 scoreThreshold（1 测试）
- [x] RagEngine: answer() 永不抛异常（1 测试）
- [x] RagEngine: getStore 暴露内部 store（1 测试）

## 约束遵守

- [x] 未修改 codeAgent / emotionAgent / navigationAgent
- [x] 未修改 .env / .env.example
- [x] 未修改 prisma/schema.prisma
- [x] 未引入新 npm 依赖
- [x] answer() 永不抛异常（全链路降级）
