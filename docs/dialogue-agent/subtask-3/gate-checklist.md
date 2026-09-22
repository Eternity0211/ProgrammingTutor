# Subtask 3 — Gate Checklist

## 代码完整性

- [x] intent-recognizer.ts（IntentRecognizer 类）
- [x] index.ts 统一 re-export
- [x] intent-recognizer.test.ts（19 测试）

## 类型安全

- [x] `npx tsc --noEmit` 零错误
- [x] recognize() 返回值必定是 IntentRecognitionResult
- [x] intent 必定是 5 类之一（VALID_INTENTS 校验）
- [x] confidence 必定在 [0, 1] 范围内（clamp）

## 测试覆盖

- [x] LLM 路径: 正确 intent + entities（1 测试）
- [x] LLM 路径: context 识别 THOUGHT_FOLLOWUP（1 测试）
- [x] LLM 路径: context 传入 prompt（1 测试）
- [x] LLM 路径: confidence clamp >1（1 测试）
- [x] LLM 路径: confidence clamp <0（1 测试）
- [x] LLM 路径: 非数字 confidence → 0.5（1 测试）
- [x] LLM 路径: 非法 intent → KNOWLEDGE_QUESTION（1 测试）
- [x] LLM 路径: 无效 JSON → fallback（1 测试）
- [x] Fallback: 不抛异常（1 测试）
- [x] Fallback: 代码块 → CODE_SUBMISSION（1 测试）
- [x] Fallback: 情绪词 → EMOTIONAL_VENTING（1 测试）
- [x] Fallback: 路径词 → LEARNING_PATH_INQUIRY（1 测试）
- [x] Fallback: 追问词+context → THOUGHT_FOLLOWUP（1 测试）
- [x] Fallback: 追问词无context → KNOWLEDGE_QUESTION（1 测试）
- [x] Fallback: 无匹配 → KNOWLEDGE_QUESTION（1 测试）
- [x] Fallback: 代码优先于情绪（1 测试）
- [x] Fallback: 实体提取 codeSnippet+language+keywords（1 测试）
- [x] Fallback: 情绪+知识点关键词提取（1 测试）
- [x] Fallback: rawText 保留原始消息（1 测试）

## 约束遵守

- [x] 未修改 codeAgent / emotionAgent / navigationAgent
- [x] 未修改 .env / .env.example
- [x] 未修改 prisma/schema.prisma
- [x] 未引入新 npm 依赖
- [x] LLM 失败时降级为正则匹配，不抛异常
