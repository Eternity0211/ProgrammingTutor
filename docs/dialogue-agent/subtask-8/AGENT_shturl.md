# Subtask 8 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/eval/` — 自动化评测框架模块

## 入口文件

- 评测运行器：`import { EvalRunner, defaultTestCases } from "@/server/model/dialogue/eval"`

## 快速使用示例

```typescript
import { EvalRunner, defaultTestCases } from "@/server/model/dialogue/eval";
import { getDialogueOrchestrator } from "@/server/model/dialogue";

// 获取编排器实例
const orchestrator = getDialogueOrchestrator();

// 创建评测运行器
const runner = new EvalRunner(orchestrator);

// 运行单个用例
const result = await runner.runSingle(defaultTestCases[0]);
console.log(result.passed); // true/false
console.log(result.failures); // 不匹配维度描述
console.log(result.actual); // 实际响应数据

// 运行全部用例
const report = await runner.runAll(defaultTestCases);
console.log(report.passRate); // 通过率
console.log(report.degradationRate); // 降级率（实际降级/全部用例）
console.log(report.results); // 每条用例结果
```

## 自定义测试用例

```typescript
import { EvalRunner } from "@/server/model/dialogue/eval";
import type { EvalTestCase } from "@/server/model/dialogue/eval";

const customCases: EvalTestCase[] = [
  {
    id: "custom-1",
    name: "自定义用例",
    input: {
      userId: "eval-user",
      message: "什么是递归？",
      // context 字段暂不使用，后续可扩展
    },
    expected: {
      intent: "KNOWLEDGE_QUESTION",
      replyContains: "递归", // 大小写敏感原始子串匹配
      degraded: false,
      hasAgentResults: true, // true=至少1个子Agent结果
    },
  },
];

const report = await runner.runAll(customCases);
```

## 下一步

Subtask 8 完成后，学生对话答疑 Agent 系统全部 8 个子任务交付完毕。
