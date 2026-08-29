import { analyzeCode } from "@/server/model/symbolic/service";

export interface RuntimeExecutionResult {
  status: "passed" | "failed";
  output: string;
  error: string;
  runtimeMs: number;
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
      output: "",
      error: buildBlockingErrorSummary(symbolic.errors),
      runtimeMs,
    };
  }

  return {
    status: "passed",
    output: "Execution completed by internal platform pipeline.",
    error: "",
    runtimeMs,
  };
}
