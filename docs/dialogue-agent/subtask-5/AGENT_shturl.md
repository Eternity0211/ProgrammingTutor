# Subtask 5 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/profile/` — 长期学生画像模块

## 入口文件

- 画像更新器：`import { ProfileUpdater } from "@/server/model/dialogue/profile"`
- 画像存储：`import { InMemoryProfileStore, DualProfileStore, DbProfileStore } from "@/server/model/dialogue/profile"`

## 快速使用示例

```typescript
import {
  ProfileUpdater,
  DualProfileStore,
  DbProfileStore,
} from "@/server/model/dialogue/profile";
import type { AgentResultSnapshot } from "@/server/model/dialogue/types";

const store = new DualProfileStore(new DbProfileStore());
const updater = new ProfileUpdater(store);

// Agent 执行后积累画像
const agentResults: AgentResultSnapshot = {
  codeReview: {
    reviewSummary: "指针使用有误",
    causalAnalysis: "内存理解不足",
    suggestions: ["复习指针"],
    confidence: 0.7,
  },
  emotion: {
    detected_emotion: "挫败",
    intensity: "强",
    reason: "多次失败",
    supportive_guidance: "加油",
  },
  navigation: {
    weaknesses: ["指针", "递归"],
    learning_path: [],
    recommended_exercises: [],
  },
};

await updater.updateFromAgentResults("user-1", agentResults, {
  questionId: "q1",
  score: 60,
});

// 对话前注入上下文
const profile = await store.getProfile("user-1");
const summary = updater.summarizeForContext(profile);
// → "该学生近期提交了1次代码，平均分60.0分，薄弱知识点：指针、递归，近期情绪：挫败(1次,强)"
```

## 注意事项

- 需执行 `npx prisma migrate dev --name add_student_profile` 生成迁移

## 下一步

Subtask 6: 对话编排 Agent 核心 — 整合意图识别、会话记忆、RAG 知识库、学生画像，统一调度。
