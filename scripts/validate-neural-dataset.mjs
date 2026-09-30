import fs from "node:fs";
import path from "node:path";

const datasetArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const datasetDir = path.resolve(datasetArg ?? "data/neural");
const requireComplete = process.argv.includes("--require-complete");
const splits = ["train", "val", "test"];
const seenInputs = new Map();
const seenIds = new Map();
const rowsBySplit = new Map(splits.map((split) => [split, []]));
const normalizeInput = (value) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();
let errors = 0;
let totalRows = 0;

for (const split of splits) {
  const filePath = path.join(datasetDir, `${split}.jsonl`);
  if (!fs.existsSync(filePath)) {
    console.error(`[dataset] missing split: ${filePath}`);
    errors += 1;
    continue;
  }
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    const level = requireComplete ? "error" : "warn";
    console[level](`[dataset] ${split} is empty`);
    if (requireComplete) errors += 1;
  }
  lines.forEach((line, index) => {
    const location = `${split}.jsonl:${index + 1}`;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      console.error(`[dataset] ${location}: invalid JSON`);
      errors += 1;
      return;
    }
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      console.error(`[dataset] ${location}: expected an object`);
      errors += 1;
      return;
    }
    for (const field of ["instruction", "input", "output"]) {
      if (typeof row[field] !== "string" || row[field].trim().length === 0) {
        console.error(`[dataset] ${location}: missing non-empty ${field}`);
        errors += 1;
      }
    }
    for (const field of [
      "id",
      "language",
      "error_type",
      "difficulty",
      "concept_id",
      "source",
    ]) {
      if (typeof row[field] !== "string" || row[field].trim().length === 0) {
        console.error(`[dataset] ${location}: missing non-empty ${field}`);
        errors += 1;
      }
    }
    if (typeof row.id === "string") {
      const previous = seenIds.get(row.id);
      if (previous) {
        console.error(
          `[dataset] duplicate id at ${location}; first seen at ${previous}`,
        );
        errors += 1;
      } else seenIds.set(row.id, location);
    }
    if (typeof row.input === "string") {
      const normalizedInput = normalizeInput(row.input);
      const previous = seenInputs.get(normalizedInput);
      if (previous) {
        const previousSplit = previous.split(".jsonl:")[0];
        const issue =
          previousSplit === split ? "duplicate input" : "cross-split leakage";
        console.error(
          `[dataset] ${issue} at ${location}; first seen at ${previous}`,
        );
        errors += 1;
      } else seenInputs.set(normalizedInput, location);
    }
    rowsBySplit.get(split).push({ row, location });
  });
  console.log(`[dataset] ${split}: ${lines.length} rows`);
  totalRows += lines.length;
}

const metadataPath = path.join(datasetDir, "metadata.json");
if (fs.existsSync(metadataPath)) {
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    for (const field of [
      "source",
      "languages",
      "error_types",
      "difficulty_levels",
      "dataset_revision",
    ]) {
      const value = metadata?.[field];
      const valid =
        field === "source" || field === "dataset_revision"
          ? typeof value === "string" && value.trim().length > 0
          : Array.isArray(value) && value.length > 0;
      if (!valid) {
        console.error(`[dataset] metadata missing provenance field: ${field}`);
        errors += 1;
      }
    }
    if (
      !metadata?.knowledge_concept_ids ||
      typeof metadata.knowledge_concept_ids !== "object"
    ) {
      console.error("[dataset] metadata missing knowledge_concept_ids mapping");
      errors += 1;
    }
    for (const split of splits) {
      const records = rowsBySplit.get(split);
      const categories = new Set(records.map(({ row }) => row.error_type));
      for (const category of metadata.error_types ?? []) {
        if (requireComplete && !categories.has(category)) {
          console.error(
            `[dataset] ${split} missing error category: ${category}`,
          );
          errors += 1;
        }
      }
      for (const { row, location } of records) {
        const expectedConcept =
          metadata.knowledge_concept_ids?.[row.error_type];
        if (!expectedConcept || expectedConcept !== row.concept_id) {
          console.error(
            `[dataset] ${location}: concept_id does not match metadata mapping`,
          );
          errors += 1;
        }
        if (!metadata.difficulty_levels?.includes(row.difficulty)) {
          console.error(
            `[dataset] ${location}: unknown difficulty ${row.difficulty}`,
          );
          errors += 1;
        }
        if (!metadata.languages?.includes(row.language)) {
          console.error(
            `[dataset] ${location}: unknown language ${row.language}`,
          );
          errors += 1;
        }
      }
    }
    const expected = metadata?.statistics?.total_samples;
    if (typeof expected === "number" && expected !== totalRows) {
      const message = `[dataset] metadata total_samples=${expected}, actual=${totalRows}`;
      if (requireComplete) {
        console.error(message);
        errors += 1;
      } else console.warn(message);
    }
  } catch {
    console.error(`[dataset] invalid metadata.json`);
    errors += 1;
  }
}

if (errors > 0) {
  console.error(`[dataset] validation failed with ${errors} error(s)`);
  process.exitCode = 1;
} else
  console.log(`[dataset] validation passed: ${seenInputs.size} unique inputs`);
