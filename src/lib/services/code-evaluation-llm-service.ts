import { AssignmentMetric, EvaluationMetric } from "@prisma/client";
import OpenAI from "openai";

interface CodeEvaluationRequest {
  code: string;
  language: string;
  questionTitle: string;
  questionDescription: string;
  metrics: (AssignmentMetric & { metric: EvaluationMetric })[];
}

interface MetricEvaluationResult {
  metricId: string;
  metricName: string;
  score: number; // 0-100
  feedback: string; // 1-2 sentences
}

interface CodeEvaluationResponse {
  evaluations: MetricEvaluationResult[];
}

/**
 * 获取阿里云百炼客户端 (兼容 OpenAI 接口)
 */
function getDashScopeClient(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY. Please set the environment variable.");
  }
  return new OpenAI({
    apiKey: apiKey.trim().replace(/^['\"]|['\"]$/g, ""),
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}

export function buildCodeEvaluationPrompt(
  request: CodeEvaluationRequest,
): string {
  const { code, language, questionTitle, questionDescription, metrics } =
    request;

  const metricsSection = metrics
    .map(
      (metric) =>
        `- **${metric.metric.name}** (ID: ${metric.metricId}, Weight: ${metric.weight}%): ${metric.metric.description || "No description provided"}`,
    )
    .join("\n");

  return `You are an expert code evaluator for programming assignments. Evaluate the following code submission based on the specified metrics.

**ASSIGNMENT CONTEXT:**
- Question: ${questionTitle}
- Description: ${questionDescription}
- Programming Language: ${language}

**CODE TO EVALUATE:**
\`\`\`${language}
${code}
\`\`\`

**EVALUATION METRICS:**
${metricsSection}

**EVALUATION INSTRUCTIONS:**
1. Evaluate each metric independently
2. Provide a score from 0-100 for each metric
3. Give 1-2 sentences of constructive feedback for each metric
4. Be objective and consistent in your evaluation
5. Consider the programming language and context

**RESPONSE FORMAT:**
Return ONLY a valid JSON object with this exact structure:
{
  "evaluations": [
    {
      "metricId": "EXACT_METRIC_ID_FROM_ABOVE",
      "metricName": "Metric Name",
      "score": 85,
      "feedback": "Clear and well-structured code with good variable naming."
    }
  ]
}

**IMPORTANT:** Use the exact metric ID values shown above - do not make up new IDs.
**CRITICAL:** Return ONLY the JSON object. Ensure all scores are integers between 0-100.`;
}

export async function evaluateCodeWithLLM(
  request: CodeEvaluationRequest,
): Promise<CodeEvaluationResponse> {
  // Validate input
  if (
    !request.code ||
    !request.language ||
    !request.questionTitle ||
    !request.metrics?.length
  ) {
    throw new Error(
      "Missing required fields: code, language, questionTitle, or metrics",
    );
  }

  const client = getDashScopeClient();
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = buildCodeEvaluationPrompt(request);

      const completion = await client.chat.completions.create({
        model: "deepseek-v3.2", // 统一使用技术文档要求的模型
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }, // 强制 JSON 输出
        temperature: 0.3,
      });

      const answerContent = completion.choices[0]?.message?.content;
      if (!answerContent) throw new Error("API returned empty content");

      let response;
      try {
        response = JSON.parse(answerContent);
      } catch (parseError) {
        console.error("Failed to parse LLM response as JSON:", answerContent);
        throw new Error("LLM returned invalid JSON format");
      }

      if (!validateEvaluationResponse(response)) {
        console.error("LLM response failed validation:", response);
        throw new Error("Invalid evaluation response format");
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`LLM evaluation attempt ${attempt} failed:`, error);

      if (
        error instanceof Error &&
        (error.message.includes("Invalid evaluation response format") ||
          error.message.includes("LLM returned invalid JSON format"))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `LLM evaluation failed after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

export function validateEvaluationResponse(
  response: any,
): response is CodeEvaluationResponse {
  if (!response || typeof response !== "object") return false;
  if (!Array.isArray(response.evaluations)) return false;

  return response.evaluations.every(
    (evaluation: any) =>
      typeof evaluation.metricId === "string" &&
      typeof evaluation.metricName === "string" &&
      typeof evaluation.score === "number" &&
      evaluation.score >= 0 &&
      evaluation.score <= 100 &&
      typeof evaluation.feedback === "string",
  );
}