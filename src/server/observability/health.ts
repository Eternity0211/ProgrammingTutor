import { prisma } from "@/lib/prisma";
import { neo4jDriver } from "@/lib/neo4j";
import { EXTERNAL_JUDGE0_API } from "@/config/route";
import { setGauge } from "./metrics";

export type DependencyMode = "required" | "optional" | "disabled";
export type DependencyStatus = "ready" | "unavailable" | "disabled";

export interface DependencyHealth {
  status: DependencyStatus;
  required: boolean;
  latencyMs?: number;
  errorType?: string;
}

export interface ReadinessReport {
  status: "ready" | "degraded" | "not_ready";
  timestamp: string;
  dependencies: Record<string, DependencyHealth>;
}

export interface HealthDependencies {
  database: () => Promise<void>;
  neo4j: () => Promise<void>;
  judge0: () => Promise<void>;
  llmConfig: () => Promise<void>;
}

const defaultDependencies: HealthDependencies = {
  database: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
  neo4j: async () => {
    await neo4jDriver.verifyConnectivity();
  },
  judge0: async () => {
    const response = await fetch(`${EXTERNAL_JUDGE0_API}/about`, {
      signal: AbortSignal.timeout(
        Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 2_000),
      ),
    });
    if (!response.ok) throw new Error(`Judge0 returned ${response.status}`);
  },
  llmConfig: async () => {
    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
  },
};

function dependencyMode(
  name: "NEO4J" | "JUDGE0" | "LLM",
  fallback: DependencyMode,
): DependencyMode {
  const configured = process.env[`HEALTHCHECK_${name}`]?.toLowerCase();
  return configured === "required" ||
    configured === "optional" ||
    configured === "disabled"
    ? configured
    : fallback;
}

async function checkDependency(
  name: string,
  mode: DependencyMode,
  check: () => Promise<void>,
  timeoutMs: number,
): Promise<[string, DependencyHealth]> {
  if (mode === "disabled") {
    setGauge(
      "programming_tutor_dependency_ready",
      "Whether an application dependency is currently ready.",
      { dependency: name, required: false },
      0,
    );
    return [name, { status: "disabled", required: false }];
  }

  const startedAt = performance.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("HealthCheckTimeout")),
          timeoutMs,
        );
      }),
    ]);
    const result: DependencyHealth = {
      status: "ready",
      required: mode === "required",
      latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
    setGauge(
      "programming_tutor_dependency_ready",
      "Whether an application dependency is currently ready.",
      { dependency: name, required: result.required },
      1,
    );
    return [name, result];
  } catch (error) {
    const result: DependencyHealth = {
      status: "unavailable",
      required: mode === "required",
      latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      errorType: error instanceof Error ? error.name : "UnknownError",
    };
    setGauge(
      "programming_tutor_dependency_ready",
      "Whether an application dependency is currently ready.",
      { dependency: name, required: result.required },
      0,
    );
    return [name, result];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkReadiness(
  dependencies: HealthDependencies = defaultDependencies,
): Promise<ReadinessReport> {
  const timeoutMs = Math.max(
    100,
    Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 2_000),
  );
  const entries = await Promise.all([
    checkDependency("postgresql", "required", dependencies.database, timeoutMs),
    checkDependency(
      "neo4j",
      dependencyMode("NEO4J", "optional"),
      dependencies.neo4j,
      timeoutMs,
    ),
    checkDependency(
      "judge0",
      dependencyMode("JUDGE0", "optional"),
      dependencies.judge0,
      timeoutMs,
    ),
    checkDependency(
      "deepseek",
      dependencyMode("LLM", "required"),
      dependencies.llmConfig,
      timeoutMs,
    ),
  ]);
  const dependencyResults = Object.fromEntries(entries);
  const values = Object.values(dependencyResults);
  const requiredUnavailable = values.some(
    (dependency) =>
      dependency.required && dependency.status === "unavailable",
  );
  const optionalUnavailable = values.some(
    (dependency) =>
      !dependency.required && dependency.status === "unavailable",
  );

  return {
    status: requiredUnavailable
      ? "not_ready"
      : optionalUnavailable
        ? "degraded"
        : "ready",
    timestamp: new Date().toISOString(),
    dependencies: dependencyResults,
  };
}
