import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import neo4j from "neo4j-driver";

const timeoutMs = Number(process.env.EXTERNAL_SERVICES_TIMEOUT_MS ?? 180_000);
const retryMs = Number(process.env.EXTERNAL_SERVICES_RETRY_MS ?? 3_000);
const checkTimeoutMs = Number(process.env.EXTERNAL_SERVICE_CHECK_TIMEOUT_MS ?? 10_000);
const deadline = Date.now() + timeoutMs;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required service variable: ${name}`);
  return value;
}

const checks = {
  PostgreSQL: async () => {
    required("DATABASE_URL");
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } finally {
      await prisma.$disconnect();
    }
  },
  Neo4j: async () => {
    const driver = neo4j.driver(
      required("NEO4J_URI"),
      neo4j.auth.basic(required("NEO4J_USER"), required("NEO4J_PASSWORD")),
    );
    try {
      await driver.verifyConnectivity();
    } finally {
      await driver.close();
    }
  },
  Judge0: async () => {
    const baseUrl = required("JUDGE0_API_URL").replace(/\/$/, "");
    const headers = {};
    const apiKey = process.env.JUDGE0_API_KEY?.trim();
    const apiHost = process.env.JUDGE0_API_HOST?.trim();
    if (apiKey) headers["x-rapidapi-key"] = apiKey;
    if (apiHost) headers["x-rapidapi-host"] = apiHost;
    const response = await fetch(`${baseUrl}/about`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  },
};

const pending = new Map(Object.entries(checks));
const lastErrors = new Map();
const lastReportedErrors = new Map();
let lastProgressAt = 0;

async function runCheckWithTimeout(name, check) {
  let timer;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${name} check timed out after ${checkTimeoutMs}ms`)),
          checkTimeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

while (pending.size > 0 && Date.now() < deadline) {
  for (const [name, check] of pending) {
    try {
      await runCheckWithTimeout(name, check);
      pending.delete(name);
      lastErrors.delete(name);
      console.log(`[ready] ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastErrors.set(name, message);
      if (lastReportedErrors.get(name) !== message) {
        console.log(`[not-ready] ${name}: ${message}`);
        lastReportedErrors.set(name, message);
      }
    }
  }

  if (pending.size > 0) {
    const now = Date.now();
    if (now - lastProgressAt >= 60_000 || lastProgressAt === 0) {
      const elapsedSeconds = Math.round((timeoutMs - (deadline - now)) / 1_000);
      console.log(
        `[waiting] ${[...pending.keys()].join(", ")} (${elapsedSeconds}s elapsed, ${Math.max(0, Math.round((deadline - now) / 1_000))}s remaining)`,
      );
      lastProgressAt = now;
    }
    await new Promise((resolve) => setTimeout(resolve, retryMs));
  }
}

if (pending.size > 0) {
  const details = [...pending.keys()]
    .map((name) => `${name}: ${lastErrors.get(name) ?? "not ready"}`)
    .join("; ");
  throw new Error(
    `External services did not become ready within ${timeoutMs}ms (${details})`,
  );
}

console.log("All external services are ready.");
