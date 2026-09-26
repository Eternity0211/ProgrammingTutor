# AI 输出质量与准出

## 目标

本项目把“模型返回了文本”和“系统可以信任并使用该文本”区分开。AI 输出只有在通过结构、证据和回归门禁后，才会进入学生反馈、学习导航或评测记录。

## 运行时防线

- RAG 只允许根据本次检索证据回答。证据不足时不调用大模型补充原生知识。
- RAG 回答必须返回结构化引用；未知来源编号、缺失正文标记或非法 JSON 都会安全降级。
- Code Review、Emotion、Navigation 都经过 Zod Schema 校验。关键输出无效时评测进入可重试的平台失败；可选输出无效时跳过，不影响确定性的测试分数。
- MCP `knowledge_answer` 同时返回 `grounded`、`citations` 和 `groundingReason`，调用方能够区分有依据回答与降级回答。
- Prompt 使用统一注册表。调用指标和 Trace 记录 Prompt ID、版本与指纹，便于复现线上结果。

## 自动准出门禁

`npm run test:ai-quality` 是 AI 相关改动的独立准出命令，覆盖：

1. Prompt ID、版本和指纹契约；
2. RAG 证据不足、合法引用、伪造引用和模型不可用路径；
3. Agent 编排质量门禁及落库前输出校验；
4. MCP 工具名、输入 Schema、只读属性、超时和结构化证据字段；
5. EvalRunner 的意图、质量、降级、引用覆盖率与无依据回答指标。

GitHub `Quality` workflow 会在类型检查、全量测试和构建之外单独执行该门禁。Prompt、Agent、MCP 或 RAG 改动若破坏契约，会在合并前失败。

## 指标含义

- `programming_tutor_rag_answers_total{outcome}`：有依据、证据不足、非法输出、检索不可用或 LLM 不可用的回答数。
- `programming_tutor_agent_output_validation_total{agent,outcome}`：各 Agent 输出有效、无效或不可用的次数。
- `programming_tutor_prompt_invocations_total{prompt_id,version}`：每个 Prompt 版本的调用量。
- Eval report 的 `groundedAnswerRate`：RAG 回答中通过引用校验的比例。
- Eval report 的 `citationCoverageRate`：RAG 回答中既有依据又带有效引用的比例。
- Eval report 的 `unsupportedAnswerRate`：既未降级又没有证据的回答比例，目标必须为 0。

## 变更规则

1. 修改 Prompt 行为时同步提升注册表版本；行为不兼容时提升主版本。
2. 修改 Agent JSON、MCP 输入输出或 RAG 响应时，同时修改 Schema、契约测试和评测数据。
3. 不允许通过放宽 Schema、删除失败样本或把无效结果改成默认“成功”来让流水线通过。
4. 需要真实模型判断的质量变化，应使用固定数据集、固定模型与温度重复运行，并保留报告；CI 的离线门禁负责结构与安全，不能替代人工标注的准确率评测。

## 故障处理

模型或依赖异常时，系统保留确定性结果和原分数，不生成伪造分析。可重试失败通过评测重试入口恢复；持续异常通过依赖熔断、限流、Trace 和上述指标定位。
