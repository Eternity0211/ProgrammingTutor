import { TestCase } from "@/lib/types/assignment-tyes";
import OpenAI from "openai";
import { getNeo4jSession } from "@/lib/neo4j";

function getDashScopeClient(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY; 
  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY environment variable.");
  }
  return new OpenAI({
    apiKey: apiKey.trim().replace(/^['\"]|['\"]$/g, ""),
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", 
  });
}

export function buildTestCaseGenerationPrompt(
  title: string,
  description: string,
  language: string,
  sampleInput?: string,
  sampleOutput?: string,
  noTestCases?: number,
): string {
  const testCaseCount = noTestCases || 5;
  const hiddenCount = Math.ceil(testCaseCount * 0.4);

  return `You are a test case generator for programming problems. Generate ${testCaseCount} comprehensive test cases for the following problem:

**Problem Details:**
- Title: ${title}
- Description: ${description}
- Language: ${language}
${sampleInput ? `- Sample Input: ${sampleInput}` : ""}
${sampleOutput ? `- Sample Output: ${sampleOutput}` : ""}

**Test Case Requirements:**
1. Generate exactly ${testCaseCount} test cases
2. Include diverse scenarios:
   - Basic/typical cases
   - Edge cases
   - Corner cases
3. Make ${hiddenCount} test cases hidden (set hidden: true)
4. Ensure inputs and outputs are appropriate for the programming language

**Critical Instructions:**
- Return ONLY a valid JSON array
- Each test case must have: "input", "expectedOutput", "hidden"

Generate the test cases now:`;
}

/**
 * 知识点定义接口
 */
export interface KnowledgeNode {
  id: string;
  name: string;
  description?: string;
  level: string;
}

/**
 * 溯源结果接口
 */
export interface KnowledgeTrace {
  target: KnowledgeNode;
  prerequisites: KnowledgeNode[];
}

/**
 * 核心逻辑：根据知识点 ID 查找前置依赖
 * 【修改重点】：即便 Neo4j 报错，也只打印日志并返回 null，不阻塞后续流程
 */
export async function traceKnowledgeDependencies(
  conceptId: string,
): Promise<KnowledgeTrace | null> {
  const session = getNeo4jSession();

  const cypher = `
    MATCH (c:Knowledge {id: $conceptId})
    OPTIONAL MATCH (c)-[:REQUIRES]->(p:Knowledge)
    RETURN {
      id: c.id,
      name: c.name,
      description: c.description,
      level: c.level,
      type: c.type
    } AS target,
    collect(DISTINCT {
      id: p.id,
      name: p.name,
      description: p.description,
      level: p.level
    }) AS prerequisites
  `;

  try {
    const result = await session.run(cypher, { conceptId });

    if (result.records.length === 0 || !result.records[0].get("target").id) {
      return null;
    }

    const record = result.records[0];
    return {
      target: record.get("target"),
      prerequisites: record
        .get("prerequisites")
        .filter((p: any) => p && p.id !== null),
    };
  } catch (error) {
    // 【修改点】：仅记录日志，不再 throw，防止 pipeline 崩溃
    console.error("⚠️ Neo4j Trace Service Unavailable (Skipping):", error);
    return null; 
  } finally {
    await session.close();
  }
}

/**
 * 批量溯源：针对一次分析产生的所有问题进行知识图谱聚合
 */
export async function getAggregatedKnowledgeContext(
  conceptIds: string[],
): Promise<KnowledgeTrace[]> {
  if (!conceptIds || conceptIds.length === 0) return [];
  
  const uniqueIds = Array.from(new Set(conceptIds));
  const traces = await Promise.all(
    uniqueIds.map((id) => traceKnowledgeDependencies(id)),
  );
  // 过滤掉所有因为数据库连接失败或未找到而产生的 null
  return traces.filter((t): t is KnowledgeTrace => t !== null);
}

export async function generateTestCases(prompt: string) {
  try {
    const client = getDashScopeClient();

    const completion = await client.chat.completions.create({
      model: "deepseek-v3.2", 
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, 
      temperature: 0.3,
    });

    const answerContent = completion.choices[0]?.message?.content;
    if (!answerContent) {
      throw new Error("API returned empty content");
    }

    const parsed = JSON.parse(answerContent);
    const testCases: Omit<TestCase, "id">[] = Array.isArray(parsed) 
      ? parsed 
      : (parsed.testCases || []);
      
    return testCases;
  } catch (error) {
    console.error("❌ DashScope API Error:", error);
    throw new Error("Failed to generate test cases via DashScope API");
  }
}