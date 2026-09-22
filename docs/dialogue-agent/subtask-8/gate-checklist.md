# Subtask 8 — Gate Checklist

## 代码完整性

- [x] eval/eval-types.ts（EvalTestCase, EvalActual, EvalResult, EvalReport）
- [x] eval/test-cases.ts（7 默认测试用例）
- [x] eval/eval-runner.ts（EvalRunner 类：runSingle, runAll, assert）
- [x] eval/index.ts 统一 re-export
- [x] eval-runner.test.ts（12 测试）

## 类型安全

- [x] `npx tsc --noEmit` 零错误
- [x] runSingle 异常分支 actual 完整填充全部字段默认值
- [x] EvalActual 所有字段均为必填（error 可选除外）

## 断言逻辑

- [x] 仅对 expected 中显式定义的字段做校验
- [x] expected 字段为 undefined 时跳过该维度
- [x] replyContains 使用大小写敏感原始子串匹配（String.includes）
- [x] hasAgentResults: true=至少1个子Agent结果; false=编排器直接回复
- [x] degraded: true=RAG降级; false=未降级

## 测试覆盖

- [x] runSingle — 基本通过（1 测试）
- [x] runSingle — intent 不匹配（1 测试）
- [x] runSingle — replyContains 不匹配（1 测试）
- [x] runSingle — degraded 不匹配（1 测试）
- [x] runSingle — hasAgentResults 不匹配（1 测试）
- [x] runSingle — 异常 → actual 填充默认值（1 测试）
- [x] runSingle — expected 字段 undefined 时跳过（1 测试）
- [x] runAll — 生成报告（1 测试）
- [x] runAll — passRate 计算（1 测试）
- [x] runAll — degradationRate 计算（1 测试）
- [x] runAll — 多个失败收集（1 测试）
- [x] runAll — durationMs 记录（1 测试）

## degradationRate 语义

- [x] degradationRate = 实际降级用例数 / 全部用例数（非预期降级命中率）

## 默认测试用例

- [x] 7 条用例
- [x] 覆盖 5 种意图
- [x] 默认用例不使用 context 字段
- [x] 包含 degraded=true 用例
- [x] 包含 hasAgentResults=false 用例

## 约束遵守

- [x] 未修改 codeAgent/emotionAgent/navigationAgent 源文件
- [x] 未修改 .env / .env.example
- [x] 未引入新 npm 依赖
- [x] 未自动执行 git 操作
- [x] EvalRunner 通过构造函数注入 orchestrator
- [x] runSingle 永不抛异常
