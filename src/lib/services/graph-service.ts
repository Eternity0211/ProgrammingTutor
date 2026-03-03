import { TestCase } from "@/lib/types/assignment-tyes";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { getNeo4jSession } from "@/lib/neo4j";

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
   - Basic/typical cases (should work with normal inputs)
   - Edge cases (boundary conditions, limits)
   - Corner cases (empty inputs, single elements, special values)
   - Invalid/error cases if applicable
3. Make ${hiddenCount} test cases hidden (set hidden: true)
4. Ensure inputs and outputs are appropriate for the programming language
5. Test different data types and ranges where applicable

**Critical Instructions:**
- Return ONLY a valid JSON array, no other text
- Each test case must have exactly these fields: "input", "expectedOutput", "hidden"
- Use proper JSON formatting with double quotes
- Ensure all strings are properly escaped
- Make inputs realistic and meaningful for the problem

**Expected JSON Format:**
[
  {
    "input": "example_input_here",
    "expectedOutput": "expected_result_here",
    "hidden": false
  }
]

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
 * 核心逻辑：根据符号分析发现的知识点 ID，在 Neo4j 中查找其前置依赖
 * 用于“知识溯源”功能，帮助学生了解报错背后的基础知识缺口
 */
export async function traceKnowledgeDependencies(conceptId: string): Promise<KnowledgeTrace | null> {
  const session = getNeo4jSession();
  
  // Cypher 查询说明：
  // 1. 匹配目标知识点 (Concept)
  // 2. 匹配其所有前置依赖 (REQUIRES 关系)
  // 3. 返回目标节点和依赖列表
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
      // 过滤掉因为 OPTIONAL MATCH 产生的空节点
      prerequisites: record.get("prerequisites").filter((p: any) => p.id !== null)
    };
  } catch (error) {
    console.error("Neo4j Trace Error:", error);
    throw new Error("Failed to trace knowledge dependencies");
  } finally {
    await session.close();
  }
}

/**
 * 批量溯源：针对一次分析产生的所有问题进行知识图谱聚合
 */
export async function getAggregatedKnowledgeContext(conceptIds: string[]): Promise<KnowledgeTrace[]> {
  const uniqueIds = Array.from(new Set(conceptIds));
  const traces = await Promise.all(
    uniqueIds.map(id => traceKnowledgeDependencies(id))
  );
  return traces.filter((t): t is KnowledgeTrace => t !== null);
}

export async function generateTestCases(prompt: string) {
  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: prompt,
      temperature: 0.3,
    });

    const cleanedText = text.trim();
    const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : cleanedText;
    const testCases: Omit<TestCase, "id">[] = JSON.parse(jsonText);
    return testCases;
  } catch (error) {
    console.error("Error calling LLM:", error);
    throw new Error("Failed to generate test cases");
  }
}
