import { PrismaClient } from "@prisma/client";
import neo4j from "neo4j-driver";

const runExternal = process.env.RUN_EXTERNAL_INTEGRATION === "1";
const externalDescribe = runExternal ? describe : describe.skip;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required external integration variable: ${name}`);
  return value;
}

externalDescribe("external service integration", () => {
  jest.setTimeout(30_000);

  it("executes a real PostgreSQL query", async () => {
    requiredEnv("DATABASE_URL");
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
      expect(Number(rows[0]?.ok)).toBe(1);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("executes a real Neo4j Cypher query", async () => {
    const driver = neo4j.driver(
      requiredEnv("NEO4J_URI"),
      neo4j.auth.basic(requiredEnv("NEO4J_USER"), requiredEnv("NEO4J_PASSWORD")),
    );
    const session = driver.session();
    try {
      await driver.verifyConnectivity();
      const result = await session.run("RETURN 1 AS ok");
      expect(result.records[0]?.get("ok").toNumber()).toBe(1);
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it("compiles and runs real C++ code through Judge0", async () => {
    const baseUrl = requiredEnv("JUDGE0_API_URL").replace(/\/$/, "");
    const apiKey = process.env.JUDGE0_API_KEY?.trim();
    const apiHost = process.env.JUDGE0_API_HOST?.trim();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey) headers["x-rapidapi-key"] = apiKey;
    if (apiHost) headers["x-rapidapi-host"] = apiHost;

    const response = await fetch(`${baseUrl}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        language_id: Number(process.env.JUDGE0_CPP_LANGUAGE_ID ?? 54),
        source_code: Buffer.from("#include <iostream>\nint main(){std::cout << 42;}").toString("base64"),
      }),
    });
    expect(response.ok).toBe(true);
    const result = await response.json() as {
      status?: { id?: number; description?: string };
      stdout?: string | null;
      message?: string | null;
    };
    expect(result.status).toMatchObject({ id: 3, description: "Accepted" });
    expect(Buffer.from(result.stdout ?? "", "base64").toString("utf8")).toBe("42");
  });
});
