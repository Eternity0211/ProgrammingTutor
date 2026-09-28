import fs from "fs";
import path from "path";
import { SymbolicResult } from "@/lib/types/symbolic-types";
import {
  createLlmClient,
  getLlmModel,
} from "@/server/model/shared/llm-provider";
import { recordLlmUsage } from "@/server/model/shared/llm-usage-recorder";
import {
  AgentOutputValidationError,
  codeReviewAgentResultSchema,
} from "@/server/model/dialogue/types/agent-results";
import { recordAgentOutputValidation } from "@/server/observability/metrics";
import { recordPromptInvocation } from "@/server/observability/metrics";
import {
  getPromptDefinition,
  promptContractHeader,
} from "@/server/model/prompts/registry";
import { validateGroundedStatements } from "./agent-grounding";

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
  ].map((issue) => {
    const ruleId = issue.ruleId.replace(/[^A-Za-z0-9_-]/g, "_");
    return {
      evidenceTag: `SYM:${ruleId}@L${issue.location.line}`,
      ruleId: issue.ruleId,
      severity: issue.severity,
      line: issue.location.line,
      message: issue.message,
      concept: issue.knowledge_concept,
    };
  });
  const numberedCode = input.code
    .split(/\r?\n/)
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");

  const neuralMetadata = loadNeuralMetadataContext();

  return `${promptContractHeader("agent.code-review")}\nYou are a code review agent for a programming tutor platform.

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

Available evidence tags:
- [CODE:Lx] or [CODE:Lx-Ly] for directly visible code
- [TEST] for pass/fail counts only; it does not reveal hidden inputs or failure causes
- [${codeReviewStatusTag(input)}] is the deterministic review status derived from tests and symbolic findings
${detectedIssues.map((issue) => `- [${issue.evidenceTag}]`).join("\n") || "- No symbolic evidence tags are available"}

Line-numbered code:
\`\`\`${input.language}
${numberedCode}
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
- Every reviewSummary, causalAnalysis, and suggestion string must include at least one available evidence tag.
- [TEST] supports only the supplied counts. Never infer hidden test inputs, runtime values, or exact failure causes from it.
- Do not claim facts about callers, compiler flags, missing includes outside the snippet, undocumented input limits, or student ability.
- Separate confirmed defects from optional hardening. Do not describe optional hardening as a student weakness or current bug.
- If no defect is confirmed, say so and keep optional suggestions to at most two.
- Discuss complexity only when it follows directly from visible loops, recursion, or containers in [CODE].`;
}

function codeReviewEvidenceTags(input: CodeReviewAgentInput): Set<string> {
  const tags = new Set(["TEST"]);
  tags.add(codeReviewStatusTag(input));
  for (let line = 1; line <= input.code.split(/\r?\n/).length; line += 1) {
    tags.add(`CODE:L${line}`);
  }
  for (const issue of [...input.symbolic.errors, ...input.symbolic.warnings]) {
    const ruleId = issue.ruleId.replace(/[^A-Za-z0-9_-]/g, "_");
    tags.add(`SYM:${ruleId}@L${issue.location.line}`);
  }
  return tags;
}

function codeReviewStatusTag(input: CodeReviewAgentInput): string {
  const confirmedByEvidence =
    input.testSummary.failed > 0 ||
    input.symbolic.errors.length > 0 ||
    input.symbolic.warnings.length > 0;
  return confirmedByEvidence
    ? "REVIEW:CONFIRMED_ISSUES"
    : "REVIEW:NO_CONFIRMED_ISSUES";
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
    const client = createLlmClient();
    const prompt = buildCodeReviewPrompt(input);
    const promptDefinition = getPromptDefinition("agent.code-review");
    recordPromptInvocation(promptDefinition.id, promptDefinition.version);

    const allowedTags = codeReviewEvidenceTags(input);
    let validationDetails = "";

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const completion = await client.chat.completions.create({
        model: getLlmModel(),
        messages: [
          { role: "user", content: prompt },
          ...(validationDetails
            ? [
                {
                  role: "user" as const,
                  content: `The previous JSON failed grounding validation: ${validationDetails}. Regenerate the complete JSON and cite available evidence in every field.`,
                },
              ]
            : []),
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const answerContent = completion.choices[0]?.message?.content;
      if (!answerContent) throw new Error("API returned empty content");
      recordLlmUsage(completion.usage, {
        agent: "code-review",
        model: getLlmModel(),
      });

      try {
        const parsed = codeReviewAgentResultSchema.safeParse(
          JSON.parse(answerContent),
        );
        if (!parsed.success) {
          validationDetails = parsed.error.message;
          continue;
        }
        const groundingIssues = validateGroundedStatements(
          [
            parsed.data.reviewSummary,
            parsed.data.causalAnalysis,
            ...parsed.data.suggestions,
          ],
          allowedTags,
        );
        if (groundingIssues.length > 0) {
          validationDetails = groundingIssues.join("; ");
          continue;
        }
        recordAgentOutputValidation("code-review", "valid");
        return {
          ...parsed.data,
          reviewSummary: `[${codeReviewStatusTag(input)}] ${parsed.data.reviewSummary}`,
        };
      } catch (error) {
        validationDetails =
          error instanceof Error ? error.message : String(error);
      }
    }

    recordAgentOutputValidation("code-review", "invalid");
    throw new AgentOutputValidationError(
      "CodeReviewAgent",
      validationDetails || "grounding validation failed",
    );
  } catch (error) {
    console.error("❌ CodeReviewAgent Error:", error);
    if (!(error instanceof AgentOutputValidationError)) {
      recordAgentOutputValidation("code-review", "unavailable");
    }
    throw new Error("Code review model output is unavailable or invalid", {
      cause: error,
    });
  }
}
