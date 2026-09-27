import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import neo4j from "neo4j-driver";

const timeoutMs = Number(process.env.EXTERNAL_SERVICES_TIMEOUT_MS ?? 180_000);
const retryMs = Number(process.env.EXTERNAL_SERVICES_RETRY_MS ?? 3_000);
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
    const response = await fetch(`${baseUrl}/about`, { headers, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  },
};

const pending = new Map(Object.entries(checks));
const lastErrors = new Map();

while (pending.size > 0 && Date.now() < deadline) {
  for (const [name, check] of pending) {
    try {
      await check();
      pending.delete(name);
      lastErrors.delete(name);
      console.log(`[ready] ${name}`);
    } catch (error) {
      lastErrors.set(name, error instanceof Error ? error.message : String(error));
    }
  }

  if (pending.size > 0) {
    console.log(`[waiting] ${[...pending.keys()].join(", ")}`);
    await new Promise((resolve) => setTimeout(resolve, retryMs));
  }
}

if (pending.size > 0) {
  const details = [...pending.keys()]
    .map((name) => `${name}: ${lastErrors.get(name) ?? "not ready"}`)
    .join("; ");
  throw new Error(`External services did not become ready within ${timeoutMs}ms (${details})`);
}

console.log("All external services are ready.");
