import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { RagEngine } from "../src/server/model/dialogue/rag/rag-engine";

type Dataset = {
  documents: Array<{ title: string; content: string }>;
  questions: Array<{
    id: string;
    question: string;
    shouldGround: boolean;
    requiredTerms: string[];
    expectedDocumentTitle: string | null;
  }>;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function includesAll(value: string, terms: string[]): boolean {
  const normalized = value.toLocaleLowerCase();
  return terms.every((term) => normalized.includes(term.toLocaleLowerCase()));
}

async function main() {
  const root = process.cwd();
  const datasetPath = path.resolve(
    process.env.RAG_BENCHMARK_SCENARIOS ||
      path.join(root, "data/evaluation/rag-benefit-scenarios.json"),
  );
  const outputPath = path.resolve(
    process.env.RAG_BENCHMARK_OUTPUT ||
      path.join(root, "data/evaluation/results/rag-benefit-final.json"),
  );
  const rounds = positiveInteger(process.env.RAG_BENCHMARK_ROUNDS, 3);
  const dataset = JSON.parse(
    await fs.readFile(datasetPath, "utf8"),
  ) as Dataset;
  const engine = new RagEngine({
    retrievalMode: "keyword",
    persistDocuments: false,
    autoLoad: false,
    scoreThreshold: 0.3,
  });
  for (const document of dataset.documents) {
    await engine.addKnowledge(document.title, document.content);
  }

  const results = [];
  for (let round = 1; round <= rounds; round += 1) {
    for (const scenario of dataset.questions) {
      const started = performance.now();
      const response = await engine.answer(scenario.question);
      results.push({
        ...scenario,
        round,
        durationMs: Math.round(performance.now() - started),
        automatic: {
          groundingMatched: response.grounded === scenario.shouldGround,
          requiredTermsPresent: includesAll(
            response.answer,
            scenario.requiredTerms,
          ),
          expectedSourcePresent:
            scenario.expectedDocumentTitle === null ||
            response.sources.some(
              (source) => source.title === scenario.expectedDocumentTitle,
            ),
          citationCount: response.citations.length,
        },
        response,
      });
    }
  }

  const passed = results.filter(
    (result) =>
      result.automatic.groundingMatched &&
      result.automatic.requiredTermsPresent &&
      result.automatic.expectedSourcePresent,
  ).length;
  const supported = results.filter((result) => result.shouldGround);
  const unsupported = results.filter((result) => !result.shouldGround);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
    retrievalMode: "keyword",
    rounds,
    automaticSummary: {
      cases: results.length,
      passRate: passed / results.length,
      groundedAnswerRate:
        supported.filter((result) => result.response.grounded).length /
        supported.length,
      correctRefusalRate:
        unsupported.filter(
          (result) =>
            result.response.degraded &&
            result.response.groundingReason === "insufficient_evidence",
        ).length / unsupported.length,
      citationCoverageRate:
        supported.filter((result) => result.response.citations.length > 0)
          .length / supported.length,
    },
    results,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report.automaticSummary, null, 2));
}

void main();
