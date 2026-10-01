# 生产可观测性

本项目现在同时提供 Trace、Metrics、结构化日志以及存活/就绪检查。应用不依赖某个特定监控厂商：Trace 使用 OTLP/HTTP，Metrics 使用 Prometheus 文本格式，日志为单行 JSON。

## 接口

- `GET /api/health/live`：只检查应用进程是否存活，适合作为容器 liveness probe。
- `GET /api/health/ready`：检查 PostgreSQL、DeepSeek 配置、Neo4j 和 Judge0。硬依赖失败返回 HTTP 503；可选依赖失败返回 HTTP 200 和 `degraded`。
- `GET /api/metrics`：Prometheus 指标。在生产环境必须使用 `Authorization: Bearer <METRICS_TOKEN>`。
- `POST /api/recommendations/events`：登录用户的推荐曝光/点击埋点。接口只接受固定的动作、来源和页面枚举，不记录用户 ID、题目 ID 或 URL，避免指标标签产生高基数和个人数据泄露。

默认情况下 PostgreSQL、DeepSeek 是硬依赖；Neo4j、Judge0 是允许降级的可选依赖。可用 `HEALTHCHECK_NEO4J`、`HEALTHCHECK_JUDGE0`、`HEALTHCHECK_LLM` 将策略设为 `required`、`optional` 或 `disabled`。

## Trace

本地开发可配置 `TRACE_LOG_PATH=./.data/traces.jsonl`。目录不存在时应用会自动创建。生产环境配置 `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` 后，Trace 会发往 OpenTelemetry Collector、Tempo 或 Jaeger 等 OTLP 接收端。

目前主链路包括：

1. 对话：会话读取、上下文压缩、意图识别、路由、RAG/Agent/LLM、质量门禁、画像与会话持久化。
2. 评测：符号分析、Judge0 测试、Neo4j 上下文、LLM 指标评分、Code Review/Emotion/Navigation Agent、数据库原子提交。

每个 Span 包含父 Span、持续时间和 `ok/error` 状态；异常只记录类型和消息，不记录代码、密钥或完整请求正文。

## 指标

核心指标如下：

- `programming_tutor_http_requests_total`：关键 API 请求量与状态码。
- `programming_tutor_http_request_duration_seconds_*`：关键 API 总耗时与样本数。
- `programming_tutor_trace_spans_total`、`programming_tutor_trace_span_duration_seconds_*`：各阶段成功率与耗时。
- `programming_tutor_evaluation_runs_total`：评测完成、阻塞和失败终态。
- `programming_tutor_llm_prompt_tokens_total`、`programming_tutor_llm_completion_tokens_total`：模型实际返回的 token 用量。
- `programming_tutor_llm_estimated_cost_total`：按 `EVAL_INPUT_PRICE_PER_1M`、`EVAL_INPUT_CACHE_HIT_PRICE_PER_1M`、`EVAL_OUTPUT_PRICE_PER_1M` 以及供应商返回的缓存命中 Token 计算的估算费用。用 `EVAL_PRICING_LABEL` 标记执行时采用的模型和峰谷价格版本。
- `programming_tutor_dependency_ready`：依赖就绪状态。
- `programming_tutor_exercise_recommendation_events_total`：按 `impression/click`、`classroom/leetcode` 和入口页面统计推荐漏斗。点击率可用同一组来源与入口标签下的 `click / impression` 计算。

当前指标注册表位于单个应用进程内。单实例部署可直接采集；多实例或 Serverless 部署应让 Prometheus 分别抓取每个常驻实例，或将指标改由 OpenTelemetry Collector 聚合。

评测队列指标由 `/api/metrics` 在每次抓取时从 PostgreSQL 汇总，因此即使 Worker 与 Web 分属不同进程，也能看到 QUEUED/RUNNING/COMPLETED/FAILED 数量、最老排队任务等待时间和过期租约数量。数据库暂时不可用时指标接口仍会响应，并将 `programming_tutor_evaluation_queue_collection_success` 设为 0。

## 本地监控栈

仓库提供可直接运行的 Prometheus、Grafana、OpenTelemetry Collector 和 Tempo 配置。它通过 Compose override 启动，不影响只启动业务依赖的日常开发：

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

启动后可访问：

- Grafana：`http://localhost:3001`（默认 `admin` / `admin`，可通过 `GRAFANA_ADMIN_USER`、`GRAFANA_ADMIN_PASSWORD` 修改）；
- Prometheus：`http://localhost:9090`；
- Tempo API：`http://localhost:3200`；
- OpenTelemetry Collector 健康检查：`http://localhost:13133`。

Grafana 会自动配置 Prometheus、Tempo 和 “Programming Tutor Operations” 仪表盘，无需手工导入。仪表盘包含推荐曝光/点击趋势以及按来源和入口拆分的点击率面板。开发栈内部使用固定的 `local-observability-token` 采集指标；该值仅用于本机 Compose 网络，生产部署必须生成独立的 `METRICS_TOKEN` 并同步到采集系统的密钥配置，不能沿用本地值。

监控容器已设置总计约 1.9GB 的内存上限。若本机同时运行另一套 Judge0 或其他重型容器，建议先停止不用的容器；Windows 报“页面文件太小”时应扩大系统页面文件或降低并发容器数量，而不是重置 Docker 数据盘。

## 日志与排障

关键 API 会输出包含时间、级别、路由、状态码和耗时的单行 JSON。`LOG_LEVEL` 支持 `debug`、`info`、`warn`、`error`。字段名属于密码、密钥、令牌、Cookie、Authorization 或代码内容时会自动脱敏。

建议排障顺序：

1. 查看 `/api/health/ready`，确定是硬依赖故障还是可选能力降级。
2. 以响应中的 `x-trace-id` 定位 Trace。
3. 根据失败 Span 判断是 Judge0、LLM、Neo4j、Agent 还是数据库。
4. 查看相同时间窗口的错误率、延迟、token 和费用指标。
5. 平台依赖故障时保留原成绩，等待服务恢复后重试评测；不要把平台故障记成学生代码失败。

## 告警与发布门禁

示例 Prometheus 告警位于 `ops/prometheus-alerts.yml`，包括硬依赖不可用、HTTP 5xx 超标、评测失败率超标、对话延迟超标、评测队列积压、Worker 租约过期和队列指标采集失败。阈值是初始建议，取得真实流量基线后应按 P95/P99 与业务容忍度调整。

CI 会先校验组合后的 Compose、Prometheus 告警规则和 OpenTelemetry Collector 配置，再依次执行数据集严格校验、类型检查、可观测性契约测试、完整 Jest 测试和生产构建。真实 PostgreSQL、Neo4j、Judge0 测试由独立任务启动一次性容器，应用 Prisma 迁移并执行真实 SQL、Cypher 和 C++ 编译运行；该任务每周自动运行，也可在 Quality workflow 中手动触发，不需要 GitHub Secrets。
