import fs from "node:fs";
import path from "node:path";
import { loadEvalCasesFromJsonl } from "@/server/model/dialogue/eval/jsonl-loader";

describe("JSONL eval loader", () => {
  it("converts dataset records into EvalTestCases", () => {
    const file = path.join(process.cwd(), "tmp-eval.jsonl");
    fs.writeFileSync(file, JSON.stringify({ instruction: "teach", input: "question" }) + "\n");
    try {
      expect(loadEvalCasesFromJsonl(file)[0]).toMatchObject({
        id: "jsonl-1",
        input: { userId: "dataset-eval-user", message: "question" },
      });
    } finally {
      fs.unlinkSync(file);
    }
  });
});
