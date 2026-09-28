import fs from "node:fs";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function round(value) {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

const reviewPath = argument("review");
const keyPath = argument("key");
const outputPath = argument("output");
if (!reviewPath || !keyPath) {
  throw new Error("Provide --review and --key files.");
}
const review = JSON.parse(fs.readFileSync(path.resolve(reviewPath), "utf8"));
const keyDocument = JSON.parse(fs.readFileSync(path.resolve(keyPath), "utf8"));
const keyById = new Map(keyDocument.key.map((item) => [item.id, item]));
const versions = {};

for (const item of review.items) {
  const key = keyById.get(item.id);
  if (!key) throw new Error(`Missing key for ${item.id}`);
  for (const candidate of [1, 2]) {
    const version = key[`candidate${candidate}`];
    const bucket = (versions[version] ??= {
      codeReviewCorrectness: [],
      emotionCorrectness: [],
      navigationRelevance: [],
      unsupportedClaims: [],
      wins: 0,
      ties: 0,
    });
    for (const [field, source] of [
      ["codeReviewCorrectness", `codeReviewCorrectness${candidate}`],
      ["emotionCorrectness", `emotionCorrectness${candidate}`],
      ["navigationRelevance", `navigationRelevance${candidate}`],
      ["unsupportedClaims", `unsupportedClaims${candidate}`],
    ]) {
      const value = item.annotation[source];
      if (typeof value === "number") bucket[field].push(value);
    }
    if (String(item.annotation.betterCandidate) === String(candidate)) {
      bucket.wins += 1;
    } else if (item.annotation.betterCandidate === "tie") {
      bucket.ties += 1;
    }
  }
}

const versionSummary = Object.fromEntries(
  Object.entries(versions).map(([version, bucket]) => [
    version,
    {
      codeReviewCorrectness: round(mean(bucket.codeReviewCorrectness)),
      emotionCorrectness: round(mean(bucket.emotionCorrectness)),
      navigationRelevance: round(mean(bucket.navigationRelevance)),
      unsupportedClaimsAverage: round(mean(bucket.unsupportedClaims)),
      wins: bucket.wins,
      ties: bucket.ties,
    },
  ]),
);
const annotatedRagItems = review.ragItems.filter(
  (item) => item.annotation.answerCorrectness !== null,
);
const ragAnnotations = annotatedRagItems.map((item) => item.annotation);
const annotatedRefusalItems = annotatedRagItems.filter(
  (item) => item.shouldGround === false,
);
const report = {
  generatedAt: new Date().toISOString(),
  versions: versionSummary,
  rag:
    ragAnnotations.length === 0
      ? null
      : {
          answerCorrectness: round(
            mean(ragAnnotations.map((item) => item.answerCorrectness)),
          ),
          evidenceSupport: round(
            mean(ragAnnotations.map((item) => item.evidenceSupport)),
          ),
          correctRefusalRate:
            annotatedRefusalItems.length === 0
              ? null
              : round(
                  annotatedRefusalItems.filter(
                    (item) => item.annotation.refusalCorrect === true,
                  ).length / annotatedRefusalItems.length,
                ),
          unsupportedClaimsAverage: round(
            mean(ragAnnotations.map((item) => item.unsupportedClaims)),
          ),
        },
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  const resolvedOutput = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, serialized, "utf8");
}
process.stdout.write(serialized);
