# 故障韧性与流量保护

第三阶段的目标是在 DeepSeek、Embedding、Judge0、Neo4j、MCP 工具或 Judge0 Redis 出现超时、拥塞和中断时，保持应用可解释地降级，并确保平台故障不会覆盖学生已有成绩。

## 外部依赖保护

DeepSeek、Embedding、Judge0 和 Neo4j 共用以下保护机制：

- **硬超时**：到达截止时间后终止等待；HTTP 调用会通过 `AbortSignal` 主动取消。
- **熔断器**：连续失败达到阈值后快速拒绝新调用，默认 30 秒后只允许一个恢复探针。
- **并发舱壁**：每个依赖拥有独立并发上限，一个服务拥塞不会占满其他服务的执行槽。
- **有限队列**：短时峰值可以排队；队列已满时快速返回可重试错误，不无限堆积内存。
- **有限重试**：DeepSeek SDK 默认最多重试两次，Embedding 最多一次；Judge0 的代码执行 POST 不自动重试，避免创建重复任务。

这些保护是每个应用实例独立的。多实例部署仍应在 API Gateway 或负载均衡器配置全局限流，同时让 Prometheus 汇总每个实例的指标。

## API 流量保护

对话、代码提交和 MCP 使用“用户 ID + 功能域”分别计数。默认一分钟额度：

- 对话：25 次；
- 代码提交及评测重试：10 次；
- MCP：60 次。

超限返回 HTTP 429、`Retry-After` 和重试秒数。请求体在解析前检查 `Content-Length`，解析后继续检查消息、上下文和代码长度，防止超大请求占用内存。

当前限流器使用进程内存，因此 Redis 中断不会影响主应用。Judge0 自己使用的 Redis 设置了容器健康检查和自动重启；Redis 未就绪时 Judge0 Server/Worker 不会启动，主应用则通过 Judge0 超时、熔断与可选 readiness 状态继续提供其他功能。

## 评测恢复

外部平台错误会产生 `FAILED_RETRYABLE` 运行，已有分数不会被写成零。所有者可调用：

```text
POST /api/submissions/{codeSubmissionId}/retry
```

重试采用原子认领，避免两个请求同时消费同一个失败记录。新运行保存 `attempt` 和 `retryOfRunId`，可以从 Trace 和数据库还原完整重试链。只有最新运行明确标记为可重试时接口才接受请求。

## MCP 与故障响应

MCP 工具默认最多执行 30 秒。超时的 REST 调用返回 HTTP 504；JSON-RPC 返回错误码 `-32001`，并在 `error.data.retryable` 标识可重试。未知工具或输入错误仍属于调用方错误，不会触发依赖熔断。

## 验证与告警

`npm run test:resilience` 覆盖超时、熔断恢复、并发队列、用户限流、请求体限制、评测失败分类、原子重试和 MCP 超时。Prometheus 告警还覆盖熔断持续开启、舱壁饱和及 429 比例过高。

故障处理顺序建议：

1. 查看 `/api/health/ready` 和 `programming_tutor_dependency_ready`。
2. 按 `x-trace-id` 定位失败依赖及超时阶段。
3. 查看 `programming_tutor_dependency_calls_total` 判断是上游错误、超时、熔断还是队列饱和。
4. 服务恢复后使用评测重试接口；不要重新计算或覆盖此前有效成绩。
