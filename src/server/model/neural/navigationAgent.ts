import { readFile } from "fs/promises";
import path from "path";

export type ExerciseDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface ExerciseBankRow {
  id: string;
  title: string;
  knowledgePoints: string[];
  questionStem: string;
  difficulty: ExerciseDifficulty;
  source: string;
  sourceUrl?: string;
}

export interface RecommendedExercise {
  exercise: ExerciseBankRow;
  score: number;
  matchedKnowledgePoints: string[];
  matchedQueryTerms: string[];
  evidence: string;
}

export interface RecommendationRequest {
  query?: string;
  weakKnowledgePoints?: string[];
  preferredDifficulty?: ExerciseDifficulty;
  excludedExerciseIds?: string[];
  topK?: number;
}

export interface RecommendationResult {
  recommendations: RecommendedExercise[];
  retrievalMeta: {
    candidateCount: number;
    queryTerms: string[];
    normalizedWeakKnowledgePoints: string[];
  };
}

const DEFAULT_TOP_K = 5;
const EXERCISE_CSV_PATH = path.join(
  process.cwd(),
  "data",
  "neural",
  "exercises.csv",
);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter((token) => token.length >= 2);
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let insideQuote = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuote = !insideQuote;
      }
      continue;
    }

    if (char === "," && !insideQuote) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function toDifficulty(value: string): ExerciseDifficulty {
  const normalized = value.toUpperCase();
  if (
    normalized === "EASY" ||
    normalized === "MEDIUM" ||
    normalized === "HARD"
  ) {
    return normalized;
  }
  return "MEDIUM";
}

function parseExerciseCsv(csvText: string): ExerciseBankRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length <= 1) {
    return [];
  }

  const records: ExerciseBankRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const fields = splitCsvLine(lines[i]);

    if (fields.length < 6) {
      continue;
    }

    const [
      id,
      title,
      knowledgePoints,
      questionStem,
      difficulty,
      source,
      sourceUrl,
    ] = fields;

    if (!id || !title || !knowledgePoints || !questionStem || !source) {
      continue;
    }

    records.push({
      id,
      title,
      knowledgePoints: knowledgePoints
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean),
      questionStem,
      difficulty: toDifficulty(difficulty),
      source,
      sourceUrl: sourceUrl || undefined,
    });
  }

  return records;
}

export async function loadExerciseBank(csvPath: string = EXERCISE_CSV_PATH) {
  const csvText = await readFile(csvPath, "utf8");
  return parseExerciseCsv(csvText);
}

function scoreExercise(
  exercise: ExerciseBankRow,
  queryTerms: string[],
  weakKnowledgePoints: string[],
  preferredDifficulty?: ExerciseDifficulty,
) {
  const exerciseKnowledge = exercise.knowledgePoints.map(normalizeText);
  const exerciseTokens = new Set(
    tokenize(
      `${exercise.title} ${exercise.questionStem} ${exercise.knowledgePoints.join(" ")} ${exercise.source}`,
    ),
  );

  const matchedKnowledgePoints = weakKnowledgePoints.filter((point) =>
    exerciseKnowledge.some((kp) => kp.includes(point) || point.includes(kp)),
  );

  const matchedQueryTerms = queryTerms.filter((term) =>
    exerciseTokens.has(term),
  );

  let score = 0;
  score += matchedKnowledgePoints.length * 3;
  score += matchedQueryTerms.length;

  if (preferredDifficulty && exercise.difficulty === preferredDifficulty) {
    score += 1.5;
  }

  return {
    score,
    matchedKnowledgePoints,
    matchedQueryTerms,
  };
}

export async function recommendExercises(
  request: RecommendationRequest,
): Promise<RecommendationResult> {
  const bank = await loadExerciseBank();
  const topK = request.topK ?? DEFAULT_TOP_K;

  const excludedIds = new Set(request.excludedExerciseIds ?? []);
  const weakKnowledgePoints = (request.weakKnowledgePoints ?? [])
    .map(normalizeText)
    .filter(Boolean);
  const queryTerms = tokenize(request.query ?? "");

  const scored = bank
    .filter((exercise) => !excludedIds.has(exercise.id))
    .map((exercise) => {
      const result = scoreExercise(
        exercise,
        queryTerms,
        weakKnowledgePoints,
        request.preferredDifficulty,
      );

      const evidenceParts: string[] = [];
      if (result.matchedKnowledgePoints.length > 0) {
        evidenceParts.push(
          `matched knowledge points: ${result.matchedKnowledgePoints.join(", ")}`,
        );
      }
      if (result.matchedQueryTerms.length > 0) {
        evidenceParts.push(
          `matched query terms: ${result.matchedQueryTerms.join(", ")}`,
        );
      }
      if (
        request.preferredDifficulty &&
        exercise.difficulty === request.preferredDifficulty
      ) {
        evidenceParts.push(`difficulty aligned: ${exercise.difficulty}`);
      }

      return {
        exercise,
        score: result.score,
        matchedKnowledgePoints: result.matchedKnowledgePoints,
        matchedQueryTerms: result.matchedQueryTerms,
        evidence:
          evidenceParts.join("; ") ||
          "fallback recommendation: broad practice for this learning stage",
      };
    })
    .sort((a, b) => b.score - a.score);

  const positive = scored.filter((item) => item.score > 0);
  const recommendations = (positive.length > 0 ? positive : scored).slice(
    0,
    topK,
  );

  return {
    recommendations,
    retrievalMeta: {
      candidateCount: bank.length,
      queryTerms,
      normalizedWeakKnowledgePoints: weakKnowledgePoints,
    },
  };
}

export function buildRecommendationPrompt(
  request: RecommendationRequest,
  retrievedExercises: RecommendedExercise[],
) {
  return [
    "You are a study navigation assistant.",
    "Only use the retrieved exercises listed below; do not invent new exercise IDs or sources.",
    `Learner context query: ${request.query ?? "N/A"}`,
    `Weak knowledge points: ${(request.weakKnowledgePoints ?? []).join(", ") || "N/A"}`,
    "Retrieved exercises:",
    ...retrievedExercises.map(
      (item, index) =>
        `${index + 1}. [${item.exercise.id}] ${item.exercise.title} | difficulty=${item.exercise.difficulty} | source=${item.exercise.source} | evidence=${item.evidence}`,
    ),
    "Return personalized suggestions based only on retrieved records.",
  ].join("\n");
}
