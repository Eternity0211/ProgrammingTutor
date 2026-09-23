import {
  assertProductionConfig,
  checkProductionConfig,
} from "@/server/config";

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
      "DASHSCOPE_API_KEY",
      "NEO4J_URI",
      "NEO4J_USER",
      "NEO4J_PASSWORD",
    ]);
    expect(() => assertProductionConfig({ NODE_ENV: "production" })).toThrow(
      "生产环境配置不完整",
    );
  });
});
