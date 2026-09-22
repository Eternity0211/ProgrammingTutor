# Subtask 3 — Agent Shortcut

## 模块定位

`src/server/model/dialogue/intent/` — 意图识别模块

## 入口文件

- 意图识别：`import { IntentRecognizer } from "@/server/model/dialogue/intent"`

## 快速使用示例

````typescript
import { IntentRecognizer } from "@/server/model/dialogue/intent";
import {
  DualSessionStore,
  DbSessionStore,
} from "@/server/model/dialogue/memory";

const recognizer = new IntentRecognizer();
const store = new DualSessionStore(new DbSessionStore());

// 无上下文
const result1 = await recognizer.recognize("什么是递归");
// result1.intent → "KNOWLEDGE_QUESTION"

// 带上下文（区分追问）
const session = await store.createSession("user-1");
const history = await store.getMessages(session.sessionId);
const result2 = await recognizer.recognize("继续说说刚才那个", history);
// result2.intent → "THOUGHT_FOLLOWUP"（fallback 路径，需 context 非空）

// 代码提交
const result3 = await recognizer.recognize(
  "这是我的代码\n```cpp\nint main() {}\n```",
);
// result3.intent → "CODE_SUBMISSION"
// result3.entities.codeSnippet → "int main() {}"
// result3.entities.language → "cpp"
````

## 下一步

Subtask 4: RAG 知识库 — 向量嵌入检索 + 降级回退大模型原生知识，用于知识点答疑。
