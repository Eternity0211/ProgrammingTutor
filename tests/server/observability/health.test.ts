import {
  checkReadiness,
  type HealthDependencies,
} from "@/server/observability/health";
import { resetMetricsForTests } from "@/server/observability/metrics";

function dependencies(
  overrides: Partial<HealthDependencies> = {},
): HealthDependencies {
  return {
    database: async () => undefined,
    neo4j: async () => undefined,
    judge0: async () => undefined,
    llmConfig: async () => undefined,
    ...overrides,
  };
}

describe("readiness checks", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.HEALTHCHECK_NEO4J;
    delete process.env.HEALTHCHECK_JUDGE0;
    delete process.env.HEALTHCHECK_LLM;
    resetMetricsForTests();
  });

  afterAll(() => {
    process.env = original;
  });

  it("is ready when all dependencies are available", async () => {
    const report = await checkReadiness(dependencies());
    expect(report.status).toBe("ready");
    expect(report.dependencies.postgresql.status).toBe("ready");
  });

  it("is degraded for an optional Neo4j failure", async () => {
    const report = await checkReadiness(
      dependencies({ neo4j: async () => Promise.reject(new Error("offline")) }),
    );
    expect(report.status).toBe("degraded");
    expect(report.dependencies.neo4j).toMatchObject({
      status: "unavailable",
      required: false,
      errorType: "Error",
    });
  });

  it("is not ready when a required dependency fails", async () => {
    const report = await checkReadiness(
      dependencies({ database: async () => Promise.reject(new Error("offline")) }),
    );
    expect(report.status).toBe("not_ready");
  });

  it("supports promoting Judge0 to a required dependency", async () => {
    process.env.HEALTHCHECK_JUDGE0 = "required";
    const report = await checkReadiness(
      dependencies({ judge0: async () => Promise.reject(new Error("offline")) }),
    );
    expect(report.status).toBe("not_ready");
    expect(report.dependencies.judge0.required).toBe(true);
  });

  it("supports disabling an optional dependency check", async () => {
    process.env.HEALTHCHECK_NEO4J = "disabled";
    const report = await checkReadiness(
      dependencies({ neo4j: async () => Promise.reject(new Error("unused")) }),
    );
    expect(report.status).toBe("ready");
    expect(report.dependencies.neo4j.status).toBe("disabled");
  });
});
