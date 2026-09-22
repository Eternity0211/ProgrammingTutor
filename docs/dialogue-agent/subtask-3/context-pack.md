# Subtask 3 — Context Pack

## 交付物

- `src/server/model/dialogue/intent/intent-recognizer.ts` — IntentRecognizer 类
- `src/server/model/dialogue/intent/index.ts` — 统一 re-export
- `tests/server/model/dialogue/intent-recognizer.test.ts` — 19 测试

## 关键设计决策

1. **LLM + Fallback 双路径**：LLM 成功时用 json_mode 分类；失败时降级为正则规则匹配，confidence 固定 0.5
2. **上下文感知**：`recognize(message, context?)` 接受可选近期消息，辅助区分 THOUGHT_FOLLOWUP（无 context 时追问词不触发 THOUGHT_FOLLOWUP）
3. **意图优先级**：代码块 > 情绪词 > 路径词 > 追问词+context > 默认 KNOWLEDGE_QUESTION
4. **实体提取双路径**：LLM 从 JSON entities 提取；fallback 用正则提取 codeSnippet/language + 预定义词表匹配 emotionKeywords/knowledgeKeywords
5. **parse 容错**：无效 JSON → fallback；非法 intent → KNOWLEDGE_QUESTION；非数字 confidence → 0.5；confidence 超范围 → clamp [0,1]

## 预定义词表

- 情绪词（18个）：挫败/焦虑/迷茫/沮丧/不行/太难/放弃/崩溃/烦躁/压力/累/烦/气馁/自信/成就感/开心/兴奋/满足
- 路径词（9个）：学习路径/下一步/怎么学/推荐练习/学习规划/学什么/学习建议/练习题/刷题
- 追问词（10个）：接着/继续/刚才/上次/那个/之前/然后/还有/另外/补充
- 编程概念（31个）：指针/引用/内存/递归/循环/数组/链表/树/图/排序/查找/动态规划/贪心/面向对象/继承/多态/封装/异常/模板/STL/容器/迭代器/lambda/函数/变量/作用域/构造/析构/虚函数/纯虚/友元/运算符重载

## 验证结果

- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue`：73/73 通过（6 套件，含 Subtask 1-2 的 54 测试）
- 原有 3 个 Agent 零改动

## 后续子任务依赖关系

- Subtask 6（编排器）：调用 `recognizer.recognize(message, context)` 获取意图，据此路由到对应 Agent
- 编排器传入的 context 来自 DualSessionStore 的会话历史（经 ContextTrimmer 裁剪）
