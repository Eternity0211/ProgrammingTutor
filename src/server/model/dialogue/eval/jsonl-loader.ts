import fs from "node:fs";
import type { DialogueRequest } from "../types";
import type { EvalTestCase } from "./eval-types";

type JsonlEvalRecord = {
  id?: string;
  name?: string;
  instruction: string;
  input: string;
  expectedReplyContains?: string;
};

export function loadEvalCasesFromJsonl(
  filePath: string,
  userId = "dataset-eval-user",
): EvalTestCase[] {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const row = JSON.parse(line) as JsonlEvalRecord;
      const input: DialogueRequest = {
        userId,
        message: row.input,
        context: { datasetInstruction: row.instruction } as never,
      };
      return {
        id: row.id ?? `jsonl-${index + 1}`,
        name: row.name ?? `JSONL case ${index + 1}`,
        input,
        expected: row.expectedReplyContains
          ? { replyContains: row.expectedReplyContains }
          : {},
      };
    });
}
