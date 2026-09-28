import { assertProductionConfig, checkProductionConfig } from "@/server/config";

describe("production config", () => {
  it("does not block development environments", () => {
    expect(checkProductionConfig({ NODE_ENV: "development" })).toEqual([]);
  });

  it("reports every missing production dependency", () => {
    const issues = checkProductionConfig({ NODE_ENV: "production" });
    expect(issues.map((issue) => issue.key)).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET",
      "JUDGE0_API_KEY",
      "JUDGE0_API_HOST",
      "DEEPSEEK_API_KEY",
      "NEO4J_URI",
      "NEO4J_USER",
      "NEO4J_PASSWORD",
      "METRICS_TOKEN",
      "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
      "EVALUATION_EXECUTION_MODE",
    ]);
    expect(() => assertProductionConfig({ NODE_ENV: "production" })).toThrow(
      "生产环境配置不完整",
    );
  });

  it("requires the durable queue in production", () => {
    const completeEnv = Object.fromEntries(
      [
        "DATABASE_URL",
        "AUTH_SECRET",
        "JUDGE0_API_KEY",
        "JUDGE0_API_HOST",
        "DEEPSEEK_API_KEY",
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "METRICS_TOKEN",
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
      ].map((key) => [key, "configured"]),
    );

    expect(
      checkProductionConfig({
        NODE_ENV: "production",
        ...completeEnv,
        EVALUATION_EXECUTION_MODE: "inline",
      }).map((issue) => issue.key),
    ).toEqual(["EVALUATION_EXECUTION_MODE"]);
  });
});
