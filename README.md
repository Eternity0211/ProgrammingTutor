# Programming Tutor / GradeIT

Programming Tutor is a full-stack programming education platform built on GradeIT. It combines classroom and assignment management, Judge0 code execution, neuro-symbolic code analysis, retrieval-augmented tutoring, student memory, and coordinated Code Review, Emotion, and Navigation agents.

## What the project provides

- Faculty and student authentication, classrooms, assignments, test cases, submissions, grading, and analytics.
- Sandboxed multi-language execution through Judge0.
- A durable PostgreSQL-backed evaluation queue and independently runnable worker.
- Static and dynamic symbolic analysis plus LLM-assisted code review.
- RAG with keyword retrieval by default and optional embedding/vector retrieval.
- Neo4j-backed knowledge relationships with graceful degradation when the graph is unavailable.
- MCP-compatible JSON-RPC tools at `/api/mcp`.
- Explicit dialogue state, context compression, session memory, student profiles, and coordinated multi-agent feedback.
- Structured logs, metrics, readiness checks, OTLP traces, Prometheus, Tempo, and Grafana.
- Offline evaluation datasets, benchmark scripts, blinded human review, and LLM token/cost capture.

## Architecture

```text
Next.js UI / API
  |-- PostgreSQL + Prisma: users, classes, submissions, memory, evaluation queue
  |-- Judge0 RuntimeHarness: compile and execute code
  |-- Symbolic engine: parser, CFG, rules, static/dynamic diagnostics
  |-- DeepSeek-compatible LLM client: dialogue and qualitative evaluation
  |-- RAG: keyword retrieval or optional external embedding service
  |-- Neo4j: prerequisite and knowledge relationships
  |-- MCP tool registry: RAG, runtime, graph, and evaluation tools
  `-- Observability: logs, Prometheus metrics, OTLP -> Collector -> Tempo/Grafana
```

The dialogue orchestrator uses an internal `DialogueStateGraph` with explicit state, nodes, edges, loop protection, and step limits. It intentionally does not depend on the external LangGraph package yet; the migration criteria are documented in [`docs/langgraph-evaluation.md`](docs/langgraph-evaluation.md).

## Technology

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Prisma 6 and PostgreSQL 15
- NextAuth 5
- Judge0, Redis, and a dedicated Judge0 PostgreSQL database
- Neo4j 5
- OpenAI-compatible DeepSeek and embedding clients
- Jest 30 and ESLint 9
- Docker Compose, Prometheus, Grafana, Tempo, and OpenTelemetry Collector

## Local setup

Requirements:

- Node.js 20 or later
- npm
- Docker Desktop for real PostgreSQL, Neo4j, Judge0, and observability services

Install and configure:

```powershell
npm ci
Copy-Item .env.example .env
```

At minimum, review these variables in `.env`:

- `DATABASE_URL`
- `AUTH_SECRET`
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL`
- `JUDGE0_API_URL`, `JUDGE0_API_KEY`, and `JUDGE0_API_HOST`
- `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

DeepSeek chat models do not provide embeddings. Keep `RAG_RETRIEVAL_MODE=keyword` when only a DeepSeek API key is available. To enable vector retrieval, configure `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, and `EMBEDDING_MODEL`, then select the vector retrieval mode.

Prepare the database and start the application:

```powershell
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The idempotent demo seed creates two teachers, four students, three classes,
five assignments, six C++ questions with test cases, representative
submissions, student profiles, and conversation history. All demo accounts use
`DEMO_PASSWORD` (default: `GradeitDemo!2026`). The seed refuses to run in
production unless `ALLOW_DEMO_SEED=1` is intentionally supplied for a
disposable environment.

The application is available at `http://localhost:3000` by default.

## Docker Compose

Start the real dependencies and run their integration test:

```powershell
docker compose up -d db neo4j judge0-server judge0-worker
npm run services:wait
npx prisma migrate deploy
npm run test:integration:external
```

Start the full application stack:

```powershell
docker compose up -d
```

Add the local observability stack:

```powershell
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Default local endpoints:

- Application: `http://localhost:3000`
- Neo4j Browser: `http://localhost:7474`
- Judge0: `http://localhost:2358`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Tempo API: `http://localhost:3200`

Do not run `docker compose down -v` unless persistent local data is intentionally being deleted.

## Quality gates

Run the same core checks used by CI:

```powershell
npm run validate:dataset:strict
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

Focused suites:

```powershell
npm run test:observability
npm run test:resilience
npm run test:ai-quality
npm run test:multi-agent
npm run test:integration:external
```

The external integration suite is skipped unless `RUN_EXTERNAL_INTEGRATION=1`; it performs real PostgreSQL, Neo4j, and Judge0 requests. GitHub Actions starts disposable service containers and runs this suite on branch pushes and scheduled checks.

## Evaluation and benefit measurement

Evaluation assets live under `data/evaluation/`. Available commands include:

```powershell
npm run benchmark:agents
npm run benchmark:rag
npm run benchmark:analyze
npm run benchmark:blind-review
npm run benchmark:human-review
```

The benchmark path records reproducible outputs, latency, token use, estimated provider cost, grounding behavior, and human labels. Generated results should be compared with the same scenarios, rounds, provider settings, and reference labels.

## Production requirements

Production startup validates required configuration. In addition to application secrets, production deployments must set:

- `METRICS_TOKEN`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `EVALUATION_EXECUTION_MODE=queue`

Run at least one `evaluation-worker` instance when queue mode is enabled. Configure HTTPS, secret storage, database backups, alert delivery, retention, and capacity limits in the target environment.

Knowledge import is an operational action, not a public feature. It is disabled by default and requires both `KNOWLEDGE_IMPORT_ENABLED=1` and an authenticated faculty account.

## Repository layout

- `src/app`: pages and API routes
- `src/server/model/dialogue`: dialogue orchestration, RAG, memory, profiles, traces, and evaluation
- `src/server/model/neural`: Code Review, Emotion, and Navigation agents
- `src/server/model/symbolic`: parser, CFG, rules, and symbolic diagnostics
- `src/server/model/pipeline`: runtime harness, submission evaluation, evidence, and queue processing
- `src/server/model/mcp`: MCP protocol and tool registry
- `tests`: unit, integration, resilience, observability, and external-service tests
- `scripts`: workers, readiness probes, datasets, and benchmarks
- `ops`: Prometheus rules and observability provisioning
- `prisma`: schema and migrations

## Current boundary

This repository contains a release-candidate implementation. A production release still requires environment-specific secrets, infrastructure, backup and alert policies, and a final end-to-end acceptance run. The older [`DOCUMENTATION.md`](DOCUMENTATION.md) describes the upstream GradeIT product and is retained as historical reference; this README is authoritative for the current branch.
