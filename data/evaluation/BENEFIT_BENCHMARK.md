# 项目收益复现实验

本目录比较用户确认的原始基线 `688863a` 与当前版本。Agent 对比固定使用同一份 12 场景数据集、同一个 DeepSeek 模型和相同的三轮执行，避免把模型供应商差异误算成代码收益。基线只做运行期 DeepSeek 兼容适配，不把临时适配提交到历史版本。

## 复现命令

```powershell
npm run benchmark:agents
npm run benchmark:rag
npm run benchmark:analyze -- --result <result.json> --usage <usage.jsonl>
npm run benchmark:blind-review -- --baseline <baseline.json> --candidate <candidate.json> --scenarios data/evaluation/benefit-scenarios.json --rag <rag.json> --output data/evaluation/benefit-blind-review.json --key-output data/evaluation/results/benefit-blind-review-key.json
npm run benchmark:human-review -- data/evaluation/benefit-blind-review.json data/evaluation/results/benefit-blind-review-key.json data/evaluation/results/benefit-human-summary.json
```

真实模型运行需要 `.env` 中的 `DEEPSEEK_API_KEY`。费用分析同时记录缓存命中/未命中 Token、输出 Token、运行时实际时段费用，以及统一峰值/低谷价下的归一化费用。自动词面指标仅用于回归提示，不能替代盲评。

人工标注时只编辑 `benefit-blind-review.json` 内的 `annotation` 字段，不要先打开 `results/benefit-blind-review-key.json`。完成后运行 `benchmark:human-review` 得到解盲汇总。
