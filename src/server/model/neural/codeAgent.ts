import fs from "fs";
import path from "path";
import { SymbolicResult } from "@/lib/types/symbolic-types";
import {
  getLocalLoraClient,
  getLocalLoraModelName,
} from "@/lib/services/local-lora-llm";

export interface CodeReviewAgentInput {
  code: string;
  language: string;
  symbolic: SymbolicResult;
  testSummary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface CodeReviewAgentResult {
  causalAnalysis: string;
  suggestions: string[];
  confidence: number;
  reviewSummary: string;
}

// function getGroqApiKey(): string {
//   const rawApiKey = process.env.GROQ_API_KEY ?? process.env.AI_GROQ_API_KEY;
//   const apiKey = rawApiKey?.trim().replace(/^['\"]|['\"]$/g, "");

//   if (!apiKey || apiKey === "your-groq-api-key") {
//     throw new Error(
//       "AI service is not configured. Please set a valid GROQ_API_KEY.",
//     );
//   }

//   return apiKey;
// }

function getClient() {
  return getLocalLoraClient();
}

function loadNeuralMetadataContext(): string {
  const metadataPath = path.resolve(process.cwd(), "data/neural/metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return "";
  }

  try {
    const raw = fs.readFileSync(metadataPath, "utf-8");
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed);
  } catch {
    return "";
  }
}

function buildCodeReviewPrompt(input: CodeReviewAgentInput): string {
  const detectedIssues = [
    ...input.symbolic.errors,
    ...input.symbolic.warnings,
  ].map((issue) => ({
    ruleId: issue.ruleId,
    severity: issue.severity,
    line: issue.location.line,
    message: issue.message,
    concept: issue.knowledge_concept,
  }));

  const neuralMetadata = loadNeuralMetadataContext();

  return `You are a code review agent for a programming tutor platform.

Task:
1. Use symbolic diagnostics as high-priority evidence.
2. Produce causal analysis focused on logic, algorithmic risks, and code quality.
3. Provide concrete, student-friendly improvement steps.
4. Return JSON only.

Neural adaptation context (LoRA training metadata, for style adaptation):
${neuralMetadata || "N/A"}

Language: ${input.language}
Test summary: ${JSON.stringify(input.testSummary)}
Symbolic findings: ${JSON.stringify(detectedIssues)}

Code:
\`\`\`${input.language}
${input.code}
\`\`\`

Output JSON schema:
{
	"reviewSummary": "string",
	"causalAnalysis": "string",
	"suggestions": ["string", "string"],
	"confidence": 0.0
}

Rules:
- confidence in [0, 1]
- suggestions must be specific and executable
- emphasize time complexity when loops or nested loops appear`;
}

// export async function runCodeReviewAgent(
//   input: CodeReviewAgentInput,
// ): Promise<CodeReviewAgentResult> {
//   const groq = createGroq({ apiKey: getGroqApiKey() });
//   const prompt = buildCodeReviewPrompt(input);

//   const { text } = await generateText({
//     model: groq("llama-3.3-70b-versatile"),
//     prompt,
//     temperature: 0.2,
//   });

//   const cleanedText = text.trim();
//   const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   const jsonText = jsonMatch ? jsonMatch[1] : cleanedText;

//   let parsed: Partial<CodeReviewAgentResult> = {};
//   try {
//     parsed = JSON.parse(jsonText);
//   } catch {
//     parsed = {
//       reviewSummary: "Code review generated in fallback mode.",
//       causalAnalysis: cleanedText,
//       suggestions: [
//         "Address symbolic critical/high issues first.",
//         "Refactor deeply nested logic and review time complexity.",
//       ],
//       confidence: 0.55,
//     };
//   }

//   return {
//     reviewSummary: parsed.reviewSummary || "Code review completed.",
//     causalAnalysis:
//       parsed.causalAnalysis || "No causal analysis was generated.",
//     suggestions:
//       parsed.suggestions && parsed.suggestions.length > 0
//         ? parsed.suggestions
//         : ["No specific suggestions returned by model."],
//     confidence:
//       typeof parsed.confidence === "number"
//         ? Math.max(0, Math.min(1, parsed.confidence))
//         : 0.5,
//   };
// }

export async function runCodeReviewAgent(
  input: CodeReviewAgentInput,
): Promise<CodeReviewAgentResult> {
  try {
    const client = getClient();
    const prompt = buildCodeReviewPrompt(input);

    const completion = await client.chat.completions.create({
      model: getLocalLoraModelName(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, //
      temperature: 0.2,
    });

    const answerContent = completion.choices[0]?.message?.content;
    if (!answerContent) throw new Error("API returned empty content");

    const parsed = JSON.parse(answerContent);

    return {
      reviewSummary: parsed.reviewSummary || "Analysis completed.",
      causalAnalysis: parsed.causalAnalysis || "No causal analysis.",
      suggestions: parsed.suggestions || [],
      confidence: parsed.confidence ?? 0.8,
    };
  } catch (error) {
    console.error("❌ CodeReviewAgent Error:", error);
    return {
      reviewSummary: "Fallback mode activated.",
      causalAnalysis: "An error occurred during AI analysis.",
      suggestions: ["Check symbolic errors manually."],
      confidence: 0.5,
    };
  }
}
