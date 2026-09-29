import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const values = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--baseline") values.baseline = argv[++index];
    else if (token === "--candidate") values.candidate = argv[++index];
    else if (token === "--scenarios") values.scenarios = argv[++index];
    else if (token === "--output") values.output = argv[++index];
    else if (token === "--key-output") values.keyOutput = argv[++index];
    else if (token === "--rag") values.rag = argv[++index];
    else positional.push(token);
  }
  const positionalNames = [
    "baseline",
    "candidate",
    "scenarios",
    "output",
    "keyOutput",
    "rag",
  ];
  positionalNames.forEach((name, index) => {
    values[name] ??= positional[index];
  });
  for (const required of ["baseline", "candidate", "scenarios", "output"]) {
    if (!values[required]) throw new Error(`Missing --${required}`);
  }
  return values;
}

function firstRoundById(document) {
  return new Map(
    document.results
      .filter((result) => result.round === 1)
      .map((result) => [result.id, result]),
  );
}

function baselineFirst(id) {
  const digest = crypto.createHash("sha256").update(id).digest();
  return digest[0] % 2 === 0;
}

function candidateOutput(result) {
  return {
    codeReview: result.output.codeReview,
    emotion: result.output.emotion,
    navigation: result.output.navigation,
  };
}

const args = parseArgs(process.argv.slice(2));
const baseline = JSON.parse(
  fs.readFileSync(path.resolve(args.baseline), "utf8"),
);
const candidate = JSON.parse(
  fs.readFileSync(path.resolve(args.candidate), "utf8"),
);
const scenarios = JSON.parse(
  fs.readFileSync(path.resolve(args.scenarios), "utf8"),
);
const baselineResults = firstRoundById(baseline);
const candidateResults = firstRoundById(candidate);
const key = [];

const items = scenarios.map((scenario) => {
  const leftIsBaseline = baselineFirst(scenario.id);
  const baselineResult = baselineResults.get(scenario.id);
  const candidateResult = candidateResults.get(scenario.id);
  if (!baselineResult || !candidateResult) {
    throw new Error(`Missing result for scenario ${scenario.id}`);
  }
  key.push({
    id: scenario.id,
    candidate1: leftIsBaseline ? baseline.mode : candidate.mode,
    candidate2: leftIsBaseline ? candidate.mode : baseline.mode,
  });
  return {
    id: scenario.id,
    name: scenario.name,
    input: {
      code: scenario.code,
      symbolic: scenario.symbolic,
      testSummary: scenario.testSummary,
      studentProfileSummary: scenario.studentProfileSummary,
      sessionContext: scenario.sessionContext,
      knowledgeGraph: scenario.knowledgeGraph,
    },
    candidate1: candidateOutput(
      leftIsBaseline ? baselineResult : candidateResult,
    ),
    candidate2: candidateOutput(
      leftIsBaseline ? candidateResult : baselineResult,
    ),
    annotation: {
      betterCandidate: "",
      codeReviewCorrectness1: null,
      codeReviewCorrectness2: null,
      emotionCorrectness1: null,
      emotionCorrectness2: null,
      navigationRelevance1: null,
      navigationRelevance2: null,
      unsupportedClaims1: null,
      unsupportedClaims2: null,
      notes: "",
    },
  };
});

const review = {
  instructions: [
    "不要猜测候选版本；Candidate 1/2 的顺序已经按样本打乱。",
    "betterCandidate 填 1、2 或 tie。",
    "六个评分字段填 1-5：1=明显错误，3=基本可用，5=准确且可直接使用。",
    "unsupportedClaims 填输出中缺少输入证据支持的关键结论数量。",
  ],
  scale: { minimum: 1, maximum: 5 },
  items,
  ragItems: args.rag
    ? JSON.parse(fs.readFileSync(path.resolve(args.rag), "utf8"))
        .results.filter((result) => result.round === 1)
        .map((result) => ({
          id: result.id,
          question: result.question,
          shouldGround: result.shouldGround,
          evidence: result.response.sources.map((source) => ({
            title: source.title,
            content: source.content,
          })),
          answer: result.response.answer,
          citations: result.response.citations,
          annotation: {
            answerCorrectness: null,
            evidenceSupport: null,
            refusalCorrect: null,
            unsupportedClaims: null,
            notes: "",
          },
        }))
    : [],
};

const output = path.resolve(args.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(review, null, 2)}\n`, "utf8");
if (args.keyOutput) {
  const keyOutput = path.resolve(args.keyOutput);
  fs.mkdirSync(path.dirname(keyOutput), { recursive: true });
  fs.writeFileSync(
    keyOutput,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), key }, null, 2)}\n`,
    "utf8",
  );
}
console.log(JSON.stringify({ output, items: items.length }, null, 2));
