import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { runCodeReviewAgent } from "../src/server/model/neural/codeAgent";
import { generateEmotionalSupport } from "../src/server/model/neural/emotionAgent";
import { generateLearningNavigation } from "../src/server/model/neural/navigationAgent";

type Scenario = {
  id: string;
  name: string;
  code: string;
  language: string;
  symbolic: unknown;
  testSummary: { total: number; passed: number; failed: number };
  emotionContext: string;
  studentHistory: string;
};

const root = process.cwd();
const mode = process.env.BENCHMARK_MODE ?? "unknown";

async function timed<T>(run: () => Promise<T>) {
  const started = performance.now();
  try {
    const value = await run();
    return { value, durationMs: Math.round(performance.now() - started), failed: false };
  } catch (error) {
    return { value: null, durationMs: Math.round(performance.now() - started), failed: true, error: String(error) };
  }
}

function isFallback(kind: "codeReview" | "emotion" | "navigation", value: unknown) {
  if (!value || typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  if (kind === "codeReview") return record.reviewSummary === "Fallback mode activated.";
  if (kind === "emotion") return !record.emotion_analysis;
  return !record.learning_navigation;
}

async function main() {
  const scenarios = JSON.parse(
    await fs.readFile(path.join(root, "data/evaluation/benefit-scenarios.json"), "utf8"),
  ) as Scenario[];
  const results = [];
  for (const scenario of scenarios) {
  const codeReview = await timed(() => runCodeReviewAgent({
    code: scenario.code,
    language: scenario.language,
    symbolic: scenario.symbolic as never,
    testSummary: scenario.testSummary,
  }));
  const reviewText = codeReview.value
    ? JSON.stringify(codeReview.value)
    : "代码审查不可用，请基于输入上下文给出保守建议。";
  const emotion = await timed(() => generateEmotionalSupport({ codeReviewResult: `${reviewText}\n${scenario.emotionContext}` }));
  const navigation = await timed(() => generateLearningNavigation({
    codeReviewResult: reviewText,
    knowledgeGraph: "[]",
    studentHistory: scenario.studentHistory,
  }));
    results.push({
    id: scenario.id,
    name: scenario.name,
    mode,
    codeReview: { durationMs: codeReview.durationMs, failed: codeReview.failed, hasResult: Boolean(codeReview.value), fallback: isFallback("codeReview", codeReview.value) },
    emotion: { durationMs: emotion.durationMs, failed: emotion.failed, hasResult: Boolean(emotion.value), fallback: isFallback("emotion", emotion.value) },
    navigation: { durationMs: navigation.durationMs, failed: navigation.failed, hasResult: Boolean(navigation.value), fallback: isFallback("navigation", navigation.value) },
    sequentialCriticalPathMs: codeReview.durationMs + emotion.durationMs + navigation.durationMs,
    output: { codeReview: codeReview.value, emotion: emotion.value, navigation: navigation.value },
    });
  }

  const outputPath = process.env.BENCHMARK_OUTPUT ?? path.join(root, "data/evaluation/results", `${mode}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ mode, generatedAt: new Date().toISOString(), results }, null, 2), "utf8");
  console.log(JSON.stringify({ mode, outputPath, cases: results.length, totalMs: results.reduce((sum, item) => sum + item.sequentialCriticalPathMs, 0) }, null, 2));
}

void main();
