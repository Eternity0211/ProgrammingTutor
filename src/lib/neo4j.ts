import neo4j, { Driver, QueryResult } from "neo4j-driver";

const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";

const globalForNeo4j = global as unknown as { neo4j?: Driver };

export const neo4jDriver =
  globalForNeo4j.neo4j ??
  neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  {
    encrypted: "ENCRYPTION_OFF",
    disableLosslessIntegers: true,
  }
);

if (process.env.NODE_ENV !== "production") {
  globalForNeo4j.neo4j = neo4jDriver;
}

export async function runCypherQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<QueryResult> {
    const session = neo4jDriver.session();
    try {
      return await session.run(cypher, params);
    } catch (err) {
      console.error("Cypher 查询失败:", err);
      throw err;
    } finally {
      await session.close();
    }
  }

export const getNeo4jSession = () => neo4jDriver.session();

/**

// 开发验证
neo4jDriver.verifyConnectivity()
  .then(() => console.log("✅ Neo4jd 连接成功"))
  .catch(err => console.error("❌ Neo4j 连接失败:", err));

  runCypherQuery(`
    MATCH (k:Knowledge {type: 'C++'}) 
    RETURN k.id, k.name, k.level
  `)
  .then(res => {
    console.log("✅ 从 Neo4j 读取到的 C++ 知识点：");
    res.records.forEach(record => {
      console.log(`- ID: ${record.get("k.id")}, 名称: ${record.get("k.name")}, 难度: ${record.get("k.level")}`);
    });
  })
  .catch(err => console.error("❌ 测试失败:", err));

*/