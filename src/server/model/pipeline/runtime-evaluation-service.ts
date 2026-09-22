import { analyzeCode } from "@/server/model/symbolic/service";

export interface RuntimeExecutionResult {
  status: "passed" | "failed" | "blocked" | "error";
  executed: boolean;
  output: string;
  error: string;
  runtimeMs: number;
  symbolic: Awaited<ReturnType<typeof analyzeCode>>;
}

function hasSymbolicBlockingIssues(
  symbolicErrors: { severity: string }[],
): boolean {
  return symbolicErrors.some(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );
}

function buildBlockingErrorSummary(
  symbolicErrors: { ruleId: string; message: string }[],
): string {
  return symbolicErrors
    .slice(0, 3)
    .map((e) => `${e.ruleId}: ${e.message}`)
    .join(" | ");
}

export async function evaluateRuntimeExecution(
  code: string,
): Promise<RuntimeExecutionResult> {
  const symbolic = await analyzeCode(code);
  const blocking = hasSymbolicBlockingIssues(symbolic.errors);
  const runtimeMs = Math.round(symbolic.metadata?.parseTime || 0);

  if (blocking) {
    return {
      status: "failed",
      executed: false,
      output: "",
      error: buildBlockingErrorSummary(symbolic.errors),
      runtimeMs,
      symbolic,
    };
  }

  // This service performs symbolic preflight only. Actual execution must go
  // through Judge0 via the submission/compile pipeline; reporting success here
  // would incorrectly claim that user code had run.
  return {
    status: "blocked",
    executed: false,
    output: "",
    error: "Runtime executor is not configured for this entry point; use the Judge0 pipeline.",
    runtimeMs,
    symbolic,
  };
}
