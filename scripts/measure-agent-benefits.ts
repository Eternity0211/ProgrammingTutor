import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Scenario = {
  id: string;
  name: string;
  category: string;
  code: string;
  language: string;
  symbolic: unknown;
  testSummary: { total: number; passed: number; failed: number };
  studentProfileSummary: string;
  sessionContext: ChatMessage[];
  knowledgeGraph: string;
  expected: {
    reviewConcepts: string[];
    acceptableEmotions: string[];
    navigationTopics: string[];
    seriousIssueExpected: boolean;
  };
};

type ExecutionMode = "sequential" | "parallel";
type Variant = "legacy" | "current";

type Agents = {
  runCodeReviewAgent: (input: never) => Promise<unknown>;
  generateEmotionalSupport: (input: never) => Promise<unknown>;
  generateLearningNavigation: (input: never) => Promise<unknown>;
};

type TimedResult<T> = {
  value: T | null;
  durationMs: number;
  failed: boolean;
  error?: string;
};

const root = process.cwd();
process.env.EVAL_DISABLE_AGENT_ARTIFACTS ??= "1";
const projectRoot = path.resolve(process.env.BENCHMARK_PROJECT_ROOT || root);
const mode = process.env.BENCHMARK_MODE?.trim() || "unknown";
const execution = parseExecutionMode(process.env.BENCHMARK_EXECUTION);
const variant = parseVariant(process.env.BENCHMARK_VARIANT);
const rounds = positiveInteger(process.env.BENCHMARK_ROUNDS, 3);
const scenarioPath = path.resolve(
  process.env.BENCHMARK_SCENARIOS ||
    path.join(root, "data/evaluation/benefit-scenarios.json"),
);

function parseExecutionMode(value: string | undefined): ExecutionMode {
  return value === "parallel" ? "parallel" : "sequential";
}

function parseVariant(value: string | undefined): Variant {
  return value === "legacy" ? "legacy" : "current";
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function timed<T>(run: () => Promise<T>): Promise<TimedResult<T>> {
  const started = performance.now();
  try {
    const value = await run();
    return {
      value,
      durationMs: Math.round(performance.now() - started),
      failed: false,
    };
  } catch (error) {
    return {
      value: null,
      durationMs: Math.round(performance.now() - started),
      failed: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function loadAgents(): Promise<Agents> {
  const neuralRoot = path.join(projectRoot, "src/server/model/neural");
  const [codeReview, emotion, navigation] = await Promise.all([
    import(pathToFileURL(path.join(neuralRoot, "codeAgent.ts")).href),
    import(pathToFileURL(path.join(neuralRoot, "emotionAgent.ts")).href),
    import(pathToFileURL(path.join(neuralRoot, "navigationAgent.ts")).href),
  ]);
  return {
    runCodeReviewAgent: codeReview.runCodeReviewAgent,
    generateEmotionalSupport: emotion.generateEmotionalSupport,
    generateLearningNavigation: navigation.generateLearningNavigation,
  };
}

function isFallback(
  kind: "codeReview" | "emotion" | "navigation",
  value: unknown,
): boolean {
  if (!value || typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  if (kind === "codeReview") {
    return record.reviewSummary === "Fallback mode activated.";
  }
  if (kind === "emotion") return !record.emotion_analysis;
  return !record.learning_navigation;
}

function reviewText(value: unknown): string {
  return value
    ? JSON.stringify(value)
    : "代码审查不可用，请基于现有证据给出保守建议。";
}

function legacyEvidence(scenario: Scenario, review: string): string {
  const recentDialogue = scenario.sessionContext
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  return [
    review,
    `学生画像：${scenario.studentProfileSummary}`,
    `近期对话：${recentDialogue}`,
  ].join("\n");
}

async function runSupportAgents(
  scenario: Scenario,
  review: string,
  agents: Agents,
) {
  const emotionInput =
    variant === "legacy"
      ? { codeReviewResult: legacyEvidence(scenario, review) }
      : {
          codeReviewResult: review,
          studentProfileSummary: scenario.studentProfileSummary,
          sessionContext: scenario.sessionContext,
        };
  const navigationInput =
    variant === "legacy"
      ? {
          codeReviewResult: review,
          knowledgeGraph: scenario.knowledgeGraph,
          studentHistory: scenario.studentProfileSummary,
        }
      : {
          codeReviewResult: review,
          knowledgeGraph: scenario.knowledgeGraph,
          studentHistory: scenario.studentProfileSummary,
          studentProfileSummary: scenario.studentProfileSummary,
          sessionContext: scenario.sessionContext,
        };

  const supportStarted = performance.now();
  let emotion: TimedResult<unknown>;
  let navigation: TimedResult<unknown>;
  if (execution === "parallel") {
    [emotion, navigation] = await Promise.all([
      timed(() => agents.generateEmotionalSupport(emotionInput as never)),
      timed(() => agents.generateLearningNavigation(navigationInput as never)),
    ]);
  } else {
    emotion = await timed(() =>
      agents.generateEmotionalSupport(emotionInput as never),
    );
    navigation = await timed(() =>
      agents.generateLearningNavigation(navigationInput as never),
    );
  }

  return {
    emotion,
    navigation,
    wallDurationMs: Math.round(performance.now() - supportStarted),
  };
}

async function main() {
  const agents = await loadAgents();
  const scenarios = JSON.parse(
    await fs.readFile(scenarioPath, "utf8"),
  ) as Scenario[];
  const results = [];
  const benchmarkStarted = performance.now();

  for (let round = 1; round <= rounds; round += 1) {
    for (const scenario of scenarios) {
      const caseStarted = performance.now();
      const codeReview = await timed(() =>
        agents.runCodeReviewAgent({
          code: scenario.code,
          language: scenario.language,
          symbolic: scenario.symbolic as never,
          testSummary: scenario.testSummary,
        } as never),
      );
      const support = await runSupportAgents(
        scenario,
        reviewText(codeReview.value),
        agents,
      );
      const endToEndDurationMs = Math.round(performance.now() - caseStarted);

      results.push({
        id: scenario.id,
        name: scenario.name,
        category: scenario.category,
        round,
        mode,
        variant,
        execution,
        expected: scenario.expected,
        codeReview: {
          durationMs: codeReview.durationMs,
          failed: codeReview.failed,
          error: codeReview.error,
          hasResult: Boolean(codeReview.value),
          fallback: isFallback("codeReview", codeReview.value),
        },
        emotion: {
          durationMs: support.emotion.durationMs,
          failed: support.emotion.failed,
          error: support.emotion.error,
          hasResult: Boolean(support.emotion.value),
          fallback: isFallback("emotion", support.emotion.value),
        },
        navigation: {
          durationMs: support.navigation.durationMs,
          failed: support.navigation.failed,
          error: support.navigation.error,
          hasResult: Boolean(support.navigation.value),
          fallback: isFallback("navigation", support.navigation.value),
        },
        supportWallDurationMs: support.wallDurationMs,
        componentDurationMs:
          codeReview.durationMs +
          support.emotion.durationMs +
          support.navigation.durationMs,
        endToEndDurationMs,
        output: {
          codeReview: codeReview.value,
          emotion: support.emotion.value,
          navigation: support.navigation.value,
        },
      });
    }
  }

  const outputPath = path.resolve(
    process.env.BENCHMARK_OUTPUT ||
      path.join(root, "data/evaluation/results", `${mode}.json`),
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        schemaVersion: 2,
        mode,
        variant,
        execution,
        rounds,
        scenarioCount: scenarios.length,
        generatedAt: new Date().toISOString(),
        model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
        projectRoot,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        mode,
        variant,
        execution,
        rounds,
        cases: results.length,
        outputPath,
        wallDurationMs: Math.round(performance.now() - benchmarkStarted),
      },
      null,
      2,
    ),
  );
}

void main();
