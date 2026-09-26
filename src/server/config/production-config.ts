export type ProductionConfigIssue = {
  key: string;
  message: string;
};

const requiredInProduction = [
  ["DATABASE_URL", "数据库连接"],
  ["AUTH_SECRET", "认证密钥"],
  ["JUDGE0_API_KEY", "Judge0 API Key"],
  ["JUDGE0_API_HOST", "Judge0 API Host"],
  ["DEEPSEEK_API_KEY", "DeepSeek LLM API Key"],
  ["NEO4J_URI", "Neo4j URI"],
  ["NEO4J_USER", "Neo4j 用户名"],
  ["NEO4J_PASSWORD", "Neo4j 密码"],
  ["METRICS_TOKEN", "指标端点访问令牌"],
  ["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "OTLP Trace 接收端点"],
] as const;

export function checkProductionConfig(
  env: NodeJS.ProcessEnv = process.env,
): ProductionConfigIssue[] {
  if (env.NODE_ENV !== "production") return [];
  return requiredInProduction
    .filter(([key]) => !env[key]?.trim())
    .map(([key, label]) => ({
      key,
      message: `${label} (${key}) 未配置`,
    }));
}

export function assertProductionConfig(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const issues = checkProductionConfig(env);
  if (issues.length > 0) {
    throw new Error(
      `生产环境配置不完整：${issues.map((issue) => issue.message).join("、")}`,
    );
  }
}
