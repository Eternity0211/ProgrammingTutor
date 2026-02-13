import { TestCase } from "@/lib/types/assignment-tyes";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

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
