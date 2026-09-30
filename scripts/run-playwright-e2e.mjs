import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = "3100";
const baseUrl = `http://${host}:${port}`;
const statusPath = path.join(process.cwd(), ".data", "e2e-status.json");

const serverEnv = {
  ...process.env,
  NODE_ENV: "production",
  NODE_OPTIONS: "--max-old-space-size=8192",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://e2e:e2e@127.0.0.1:5432/e2e?schema=public",
  AUTH_SECRET:
    process.env.AUTH_SECRET ?? "e2e-only-secret-at-least-32-characters",
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY ?? "e2e-placeholder",
  JUDGE0_API_HOST: process.env.JUDGE0_API_HOST ?? "judge0.invalid",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "e2e-placeholder",
  NEO4J_URI: process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687",
  NEO4J_USER: process.env.NEO4J_USER ?? "neo4j",
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD ?? "e2e-placeholder",
  METRICS_TOKEN: "e2e-metrics-token",
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://127.0.0.1:4318/v1/traces",
  EVALUATION_EXECUTION_MODE: "queue",
  AUTH_URL: baseUrl,
  NEXTAUTH_URL: baseUrl,
  NEXT_PUBLIC_APP_URL: baseUrl,
};

const nextCli = "node_modules/next/dist/bin/next";
const playwrightCli = "node_modules/@playwright/test/cli.js";
const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", host, "--port", port],
  { cwd: process.cwd(), env: serverEnv, stdio: "inherit" },
);

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next.js server exited early with code ${server.exitCode}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/api/health/live`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(500);
  }
  throw new Error("Timed out waiting for the Next.js E2E server");
}

async function stopProcessTree(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    const completed = new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/PID", String(child.pid), "/T", "/F"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
    await Promise.race([completed, delay(5_000)]);
    if (child.exitCode === null) child.kill();
    return;
  }
  child.kill("SIGTERM");
}

async function waitForTestResult(tests) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const result = JSON.parse(await readFile(statusPath, "utf8"));
      return result.status === "passed" ? 0 : 1;
    } catch {
      if (tests.exitCode !== null) return tests.exitCode ?? 1;
      await delay(250);
    }
  }
  throw new Error("Timed out waiting for the Playwright result");
}

let exitCode = 1;
let tests;
try {
  await rm(statusPath, { force: true });
  await waitForServer();
  tests = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  exitCode = await waitForTestResult(tests);
  await delay(500);
} finally {
  if (tests) await stopProcessTree(tests);
  await stopProcessTree(server);
}

process.exitCode = exitCode;
