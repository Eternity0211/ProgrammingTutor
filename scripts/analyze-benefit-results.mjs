import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const values = { results: [], usage: [], output: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--result") values.results.push(argv[++index]);
    else if (token === "--usage") values.usage.push(argv[++index]);
    else if (token === "--output") values.output = argv[++index];
  }
  if (values.results.length === 0) {
    throw new Error("Provide at least one --result <file> argument.");
  }
  return values;
}

function percentile(values, quantile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(quantile * sorted.length) - 1),
  );
  return sorted[index];
}

function mean(values) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function containsTerm(output, term) {
  return JSON.stringify(output)
    .toLocaleLowerCase()
    .includes(term.toLocaleLowerCase());
}

function lexicalCoverage(output, terms) {
  if (!terms.length) return 1;
  return (
    terms.filter((term) => containsTerm(output, term)).length / terms.length
  );
}

function emotionMatch(output, acceptable) {
  const detected = output?.emotion_analysis?.detected_emotion;
  return typeof detected === "string" && acceptable.includes(detected);
}

function summarizeResult(document) {
  const results = document.results;
  const latencies = results.map(
    (item) => item.endToEndDurationMs ?? item.sequentialCriticalPathMs ?? 0,
  );
  const supportLatencies = results.map(
    (item) =>
      item.supportWallDurationMs ??
      (item.emotion?.durationMs || 0) + (item.navigation?.durationMs || 0),
  );
  const componentLatencies = results.map(
    (item) => item.componentDurationMs ?? item.sequentialCriticalPathMs ?? 0,
  );
  const labeledResults = results.filter((item) => item.expected);
  const agents = ["codeReview", "emotion", "navigation"];
  const agentMetrics = Object.fromEntries(
    agents.map((agent) => {
      const attempts = results.map((item) => item[agent]);
      return [
        agent,
        {
          availabilityRate: round(
            attempts.filter((item) => item.hasResult).length / attempts.length,
            4,
          ),
          failureRate: round(
            attempts.filter((item) => item.failed).length / attempts.length,
            4,
          ),
          fallbackRate: round(
            attempts.filter((item) => item.fallback).length / attempts.length,
            4,
          ),
          averageDurationMs: round(
            mean(attempts.map((item) => item.durationMs)),
          ),
        },
      ];
    }),
  );

  return {
    mode: document.mode,
    variant: document.variant,
    execution: document.execution,
    model: document.model,
    rounds: document.rounds,
    cases: results.length,
    latency: {
      averageMs: round(mean(latencies)),
      p50Ms: percentile(latencies, 0.5),
      p95Ms: percentile(latencies, 0.95),
      supportAverageMs: round(mean(supportLatencies)),
      componentAverageMs: round(mean(componentLatencies)),
      parallelOverlapSavedMs: round(mean(componentLatencies) - mean(latencies)),
    },
    qualityProxy: {
      reviewConceptCoverage:
        labeledResults.length === 0
          ? null
          : round(
              mean(
                labeledResults.map((item) =>
                  lexicalCoverage(
                    item.output.codeReview,
                    item.expected.reviewConcepts,
                  ),
                ),
              ),
              4,
            ),
      emotionReferenceMatch:
        labeledResults.length === 0
          ? null
          : round(
              labeledResults.filter((item) =>
                emotionMatch(
                  item.output.emotion,
                  item.expected.acceptableEmotions,
                ),
              ).length / labeledResults.length,
              4,
            ),
      navigationTopicCoverage:
        labeledResults.length === 0
          ? null
          : round(
              mean(
                labeledResults.map((item) =>
                  lexicalCoverage(
                    item.output.navigation,
                    item.expected.navigationTopics,
                  ),
                ),
              ),
              4,
            ),
    },
    agents: agentMetrics,
  };
}

function loadUsage(files) {
  const records = files.flatMap((file) => {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  });
  const officialDeepSeekFlashCostUsd = records.reduce((sum, record) => {
    if (record.model !== "deepseek-flash" || !record.timestamp) return sum;
    const timestamp = new Date(record.timestamp);
    const weekday = timestamp.getUTCDay();
    const hour = timestamp.getUTCHours();
    const isWeekday = weekday >= 1 && weekday <= 5;
    const isPeak =
      isWeekday && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
    const cachedRate = isPeak ? 0.006 : 0.003;
    const uncachedRate = isPeak ? 0.3 : 0.15;
    const outputRate = isPeak ? 1.2 : 0.6;
    return (
      sum +
      ((record.cachedPromptTokens || 0) * cachedRate +
        (record.uncachedPromptTokens ?? record.promptTokens ?? 0) *
          uncachedRate +
        (record.completionTokens || 0) * outputRate) /
        1_000_000
    );
  }, 0);
  const deepSeekFlashRecords = records.filter(
    (record) => record.model === "deepseek-flash",
  );
  const costAtRates = (cachedRate, uncachedRate, outputRate) =>
    deepSeekFlashRecords.reduce(
      (sum, record) =>
        sum +
        ((record.cachedPromptTokens || 0) * cachedRate +
          (record.uncachedPromptTokens ?? record.promptTokens ?? 0) *
            uncachedRate +
          (record.completionTokens || 0) * outputRate) /
          1_000_000,
      0,
    );
  return {
    requests: records.length,
    promptTokens: records.reduce(
      (sum, record) => sum + (record.promptTokens || 0),
      0,
    ),
    cachedPromptTokens: records.reduce(
      (sum, record) => sum + (record.cachedPromptTokens || 0),
      0,
    ),
    completionTokens: records.reduce(
      (sum, record) => sum + (record.completionTokens || 0),
      0,
    ),
    totalTokens: records.reduce(
      (sum, record) => sum + (record.totalTokens || 0),
      0,
    ),
    estimatedCostUsd: round(
      records.reduce((sum, record) => sum + (record.estimatedCost || 0), 0),
      8,
    ),
    officialDeepSeekFlashCostUsd: round(officialDeepSeekFlashCostUsd, 8),
    normalizedDeepSeekFlashPeakCostUsd: round(
      costAtRates(0.006, 0.3, 1.2),
      8,
    ),
    normalizedDeepSeekFlashOffPeakCostUsd: round(
      costAtRates(0.003, 0.15, 0.6),
      8,
    ),
    officialPricingReference:
      "DeepSeek flash peak/off-peak rates effective 2026-09-28; classified by each record's UTC timestamp",
  };
}

const args = parseArgs(process.argv.slice(2));
const documents = args.results.map((file) =>
  JSON.parse(fs.readFileSync(path.resolve(file), "utf8")),
);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  runs: documents.map(summarizeResult),
  usage: loadUsage(args.usage.map((file) => path.resolve(file))),
  notes: [
    "qualityProxy uses deterministic lexical/reference checks and is not a substitute for blinded human review",
    "estimatedCostUsd uses prices configured at execution time and provider-reported token usage",
  ],
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) {
  const output = path.resolve(args.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serialized, "utf8");
}
process.stdout.write(serialized);
