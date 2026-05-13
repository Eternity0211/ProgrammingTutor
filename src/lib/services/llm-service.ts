import { TestCase } from "@/lib/types/assignment-tyes";
import {
  getLocalLoraClient,
  getLocalLoraModelName,
} from "@/lib/services/local-lora-llm";

// function getGroqApiKey(): string {
//   const rawApiKey = process.env.GROQ_API_KEY ?? process.env.AI_GROQ_API_KEY;
//   const apiKey = rawApiKey?.trim().replace(/^['\"]|['\"]$/g, "");

//   if (!apiKey || apiKey === "your-groq-api-key") {
//     throw new Error(
//       "AI service is not configured. Please set a valid GROQ_API_KEY.",
//     );
//   }

//   if (!apiKey.startsWith("gsk_")) {
//     throw new Error(
//       "GROQ_API_KEY format looks invalid. Expected a key starting with gsk_.",
//     );
//   }

//   return apiKey;
// }

function getClient() {
  return getLocalLoraClient();
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

// export async function generateTestCases(prompt: string) {
//   try {
//     const groqApiKey = getGroqApiKey();
//     const groq = createGroq({ apiKey: groqApiKey });

//     const { text } = await generateText({
//       model: groq("llama-3.3-70b-versatile"),
//       prompt: prompt,
//       temperature: 0.3,
//     });

//     const cleanedText = text.trim();
//     const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//     const jsonText = jsonMatch ? jsonMatch[1] : cleanedText;
//     const testCases: Omit<TestCase, "id">[] = JSON.parse(jsonText);
//     return testCases;
//   } catch (error: unknown) {
//     console.error("Error calling LLM:", error);
//     const message =
//       error instanceof Error ? error.message : "Failed to generate test cases";

//     if (/invalid api key|401/i.test(message)) {
//       throw new Error(
//         "Groq API key is invalid. Please update GROQ_API_KEY in your environment.",
//       );
//     }

//     throw new Error(message || "Failed to generate test cases");
//   }
// }

export async function generateTestCases(prompt: string) {
  try {
    const client = getClient();

    // 调用本地 LoRA 模型
    const completion = await client.chat.completions.create({
      model: getLocalLoraModelName(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // 强制 JSON 格式输出
      temperature: 0.3,
    });

    const answerContent = completion.choices[0]?.message?.content;

    if (!answerContent) {
      throw new Error("API 返回内容为空");
    }

    // 解析结果
    const parsedData = JSON.parse(answerContent);

    // 兼容原有的返回数组逻辑
    const testCases: Omit<TestCase, "id">[] = Array.isArray(parsedData)
      ? parsedData
      : parsedData.testCases || [];

    return testCases;
  } catch (error: unknown) {
    console.error("❌ Error calling local LoRA model API:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate test cases";

    if (/invalid api key|401/i.test(message)) {
      throw new Error(
        "LOCAL_LLM_API_KEY is invalid. Please update your environment.",
      );
    }

    throw new Error(message || "Failed to generate test cases");
  }
}
