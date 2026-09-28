# Multi-Agent 并行编排

第五阶段把代码提交后的 Agent 链路从串行改为有向无环图：

```text
符号分析 / 运行测试
          |
     Code Review -----------+
          |                 |
          +--> Emotion -----+--> 统一校验与原子落库
          |                 |
知识图谱 -+--> Navigation --+
```

## 执行规则

- Code Review 仍是代码提交场景的主证据，不会为了并行而使用不完整的审查结果。
- Emotion 与 Navigation 在 Code Review 可用后同时启动，互不等待；知识图谱查询可以与 Code Review 并行准备。
- 一个可选 Agent 失败不会取消另一个，也不会覆盖确定性的测试成绩。
- 情绪判断的证据权重为代码审查 60%、近期对话 25%、学生画像 15%。学生在对话中明确表达的情绪优先于间接推断。
- 没有 Code Review 时，情绪支持或学习导航仍可根据学生画像或近期对话运行；Navigation 可以再使用知识图谱补充事实关系，但知识图谱本身不能替代学生证据。

## 结果更新与追溯

每次调用都会从当前代码审查、学生画像、对话上下文和知识图谱重新构造输入。输入规范化后生成 16 位 `evidenceFingerprint`，并和 `evidenceSources` 一起写入 Agent Span。任一来源变化都会得到不同指纹，因此可以从 Trace 判断结果变化对应的是哪一版证据。

Prompt `agent.code-review` 为 `2.0.0`，`agent.emotion-support` 与 `agent.learning-navigation` 为 `3.0.0`；三者都要求输出引用可用证据，Trace 同时记录 Prompt 版本和指纹。

## 验证

`npm run test:multi-agent` 覆盖：

1. 两个下游 Agent 在同一调度阶段启动；
2. 可选 Agent 故障隔离；
3. 证据变化产生新指纹；
4. 对话编排与提交评测的结果校验和落库行为。

`npm run lint:multi-agent` 对本阶段涉及的编排、Agent、Prompt、Schema 和测试执行零警告门禁。`npm run lint` 仍会报告全项目历史技术债，便于后续逐步清理；历史问题不会被关闭规则来隐藏。

真实性能收益应在固定数据集上比较串行基线和当前版本的端到端 P50/P95；理论等待时间由 `Emotion + Navigation` 降为 `max(Emotion, Navigation)`，但最终收益仍受 Code Review、Judge0、LLM 限流和网络延迟影响。
