# Subtask 8 — Context Pack

## 交付物

- `src/server/model/dialogue/eval/eval-types.ts` — 评测类型定义（EvalTestCase, EvalActual, EvalResult, EvalReport）
- `src/server/model/dialogue/eval/test-cases.ts` — 7 条默认测试用例
- `src/server/model/dialogue/eval/eval-runner.ts` — EvalRunner 类（runSingle, runAll, assert）
- `src/server/model/dialogue/eval/index.ts` — 统一 re-export
- `tests/server/model/dialogue/eval-runner.test.ts` — 12 测试

## 关键设计决策

1. **degradationRate 语义**：`实际降级用例数 / 全部用例数`，衡量全部用例中实际发生降级的占比，**不是**预期降级用例的命中率
2. **replyContains 匹配规则**：大小写敏感原始子串匹配，使用 `String.includes()` 判断
3. **hasAgentResults 语义**：true = 至少拿到 1 个子 Agent 结果（`response.agentResults !== undefined`）；false = 编排器直接回复、未调用子 Agent
4. **degraded 语义**：true = `response.agentResults?.rag?.degraded === true`（RAG 降级）；false = 未降级
5. **断言逻辑**：仅对 `expected` 对象中显式定义的字段做校验；字段为 `undefined` 时直接跳过该维度，不进行比对
6. **runSingle 异常处理**：catch 分支 `actual` 完整填充全部字段默认值（reply="", intent="THOUGHT_FOLLOWUP", sessionId="", traceId="", hasAgentResults=false, degraded=false, error=异常消息），避免 TS 类型报错
7. **默认测试用例**：7 条，覆盖 5 种意图 + 降级场景 + 无 Agent 结果场景；暂不使用 `context` 字段，后续可扩展
8. **EvalRunner 注入**：通过构造函数注入 `DialogueOrchestrator`，便于测试 mock
9. **runSingle 永不抛异常**：catch 后返回 `EvalResult`（passed=false, actual 含默认值 + error）

## 验证结果

- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue --runInBand`：147/147 通过（12 套件，含 Subtask 1-7 的 135 测试 + Subtask 8 的 12 测试）
  - eval-runner.test.ts：12/12 通过
  - 注：llm-client.test.ts 有 3 个预存失败（环境配置不匹配，与 Subtask 8 无关）
- 原有 3 个 Agent 源文件零改动
- 未修改 .env
- 未引入新 npm 依赖

## 后续

Subtask 8 完成后，学生对话答疑 Agent 系统全部 8 个子任务交付完毕。
