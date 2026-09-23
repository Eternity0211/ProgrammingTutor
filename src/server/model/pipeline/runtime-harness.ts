import { EXTERNAL_JUDGE0_API } from "@/config/route";
import {
  normalizeJudge0Result,
  type Judge0ExecutionLike,
  type NormalizedRuntimeResult,
} from "./runtime-result";

export interface RuntimeHarnessRequest {
  code: string;
  input?: string;
  expectedOutput?: string;
  languageId: number;
}

export interface RuntimeHarness {
  execute(request: RuntimeHarnessRequest): Promise<NormalizedRuntimeResult>;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

export class Judge0RuntimeHarness implements RuntimeHarness {
  async execute(request: RuntimeHarnessRequest): Promise<NormalizedRuntimeResult> {
    const payload = {
      source_code: encode(request.code),
      stdin: encode(request.input ?? ""),
      language_id: request.languageId,
      expected_output: encode(request.expectedOutput ?? ""),
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = process.env.JUDGE0_API_KEY?.trim();
    const apiHost = process.env.JUDGE0_API_HOST?.trim();
    if (apiKey && apiHost) {
      headers["X-RapidAPI-Key"] = apiKey;
      headers["X-RapidAPI-Host"] = apiHost;
    }
    const response = await fetch(
      `${EXTERNAL_JUDGE0_API}/submissions?base64_encoded=true&wait=true`,
      { method: "POST", headers, body: JSON.stringify(payload) },
    );
    if (!response.ok) {
      throw new Error(`Judge0 request failed (${response.status}): ${await response.text()}`);
    }
    return normalizeJudge0Result((await response.json()) as Judge0ExecutionLike);
  }
}
