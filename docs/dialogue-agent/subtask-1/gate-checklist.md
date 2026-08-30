# Subtask 1 — Gate Checklist

## 代码完整性
- [x] 新建目录 `src/server/model/dialogue/types/` 及 `shared/`
- [x] 7 个类型文件全部创建（intent/session/profile/rag/trace/dialogue/index）
- [x] 共享 LLM 客户端 `llm-client.ts` 创建
- [x] 链路日志 `trace-logger.ts` 创建
- [x] 2 个测试文件创建

## 类型安全
- [x] `npx tsc --noEmit` 零错误
- [x] 所有接口字段命名与现有 Agent 输出对齐
- [x] 无 any 类型

## 测试覆盖
- [x] TraceLogger: traceId 生成、span 计时、event 记录、context 隔离、嵌套 span、未知 span 容错、不可变性、属性合并（10 测试）
- [x] DialogueLlmClient: 缺 key 抛错、单例复用、DashScope 鉴权配置、chatCompletion 参数、createEmbedding 同实例、空 content 抛错、空 embedding 返回（7 测试）

## 约束遵守
- [x] 未修改 codeAgent.ts / emotionAgent.ts / navigationAgent.ts
- [x] 未修改 .env / .env.example
- [x] 未修改 prisma/schema.prisma
- [x] 未引入新 npm 依赖（复用 openai 包）
- [x] 类型文件无运行时逻辑（index.ts 仅 re-export）

## LLM 客户端约束
- [x] createEmbedding 复用同一 OpenAI 实例（同一 apiKey + baseURL）
- [x] 未独立实现第二套 OpenAI 配置
