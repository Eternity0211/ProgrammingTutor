import fs from "node:fs";
import path from "node:path";

const datasetArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const datasetDir = path.resolve(datasetArg ?? "data/neural");
const requireComplete = process.argv.includes("--require-complete");
const splits = ["train", "val", "test"];
const seenInputs = new Map();
const normalizeInput = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
let errors = 0;
let totalRows = 0;

for (const split of splits) {
  const filePath = path.join(datasetDir, `${split}.jsonl`);
  if (!fs.existsSync(filePath)) {
    console.error(`[dataset] missing split: ${filePath}`);
    errors += 1;
    continue;
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    const level = requireComplete ? "error" : "warn";
    console[level](`[dataset] ${split} is empty`);
    if (requireComplete) errors += 1;
  }
  lines.forEach((line, index) => {
    const location = `${split}.jsonl:${index + 1}`;
    let row;
    try { row = JSON.parse(line); } catch { console.error(`[dataset] ${location}: invalid JSON`); errors += 1; return; }
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
    if (typeof row.input === "string") {
      const normalizedInput = normalizeInput(row.input);
      const previous = seenInputs.get(normalizedInput);
      if (previous) {
        const previousSplit = previous.split(".jsonl:")[0];
        const issue = previousSplit === split ? "duplicate input" : "cross-split leakage";
        console.error(`[dataset] ${issue} at ${location}; first seen at ${previous}`);
        errors += 1;
      } else seenInputs.set(normalizedInput, location);
    }
  });
  console.log(`[dataset] ${split}: ${lines.length} rows`);
  totalRows += lines.length;
}

const metadataPath = path.join(datasetDir, "metadata.json");
if (fs.existsSync(metadataPath)) {
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    for (const field of ["source", "languages", "error_types", "difficulty_levels", "dataset_revision"]) {
      const value = metadata?.[field];
      const valid = field === "source" || field === "dataset_revision"
        ? typeof value === "string" && value.trim().length > 0
        : Array.isArray(value) && value.length > 0;
      if (!valid) {
        console.error(`[dataset] metadata missing provenance field: ${field}`);
        errors += 1;
      }
    }
    if (!metadata?.knowledge_concept_ids || typeof metadata.knowledge_concept_ids !== "object") {
      console.error("[dataset] metadata missing knowledge_concept_ids mapping");
      errors += 1;
    }
    const expected = metadata?.statistics?.total_samples;
    if (typeof expected === "number" && expected !== totalRows) {
      const message = `[dataset] metadata total_samples=${expected}, actual=${totalRows}`;
      if (requireComplete) { console.error(message); errors += 1; }
      else console.warn(message);
    }
  } catch {
    console.error(`[dataset] invalid metadata.json`);
    errors += 1;
  }
}

if (errors > 0) { console.error(`[dataset] validation failed with ${errors} error(s)`); process.exitCode = 1; }
else console.log(`[dataset] validation passed: ${seenInputs.size} unique inputs`);
