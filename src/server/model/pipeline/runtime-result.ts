export type Judge0ExecutionLike = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description: string };
  time?: string | null;
  memory?: number | null;
};

export type NormalizedRuntimeStatus = "passed" | "failed" | "timeout" | "error";
export type RuntimeFailureKind = "symbolic" | "compile" | "runtime" | "timeout" | "configuration";

export interface NormalizedRuntimeResult {
  status: NormalizedRuntimeStatus;
  output: string;
  error: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  judgeStatusId: number | null;
  judgeStatus: string | null;
  failureKind?: RuntimeFailureKind;
}

export function normalizeSymbolicPreflight(params: {
  blocking: boolean;
  error: string;
  runtimeMs?: number;
}): NormalizedRuntimeResult {
  return {
    status: params.blocking ? "failed" : "passed",
    output: "",
    error: params.error,
    runtimeMs: params.runtimeMs ?? null,
    memoryKb: null,
    judgeStatusId: null,
    judgeStatus: null,
    ...(params.blocking ? { failureKind: "symbolic" as const } : {}),
  };
}

export function decodeJudge0(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
}

export function normalizeJudge0Result(
  execution: Judge0ExecutionLike,
): NormalizedRuntimeResult {
  const statusId = execution.status?.id ?? null;
  const statusDescription = execution.status?.description ?? null;
  const compileOutput = decodeJudge0(execution.compile_output);
  const stderr = decodeJudge0(execution.stderr);
  const output = decodeJudge0(execution.stdout);
  const error = compileOutput || stderr || execution.message || "";
  const failureKind: RuntimeFailureKind | undefined =
    statusId === 5 ? "timeout" : statusId === 6 ? "compile" : error ? "runtime" : undefined;
  const runtimeMs = execution.time
    ? Math.round(Number.parseFloat(execution.time) * 1000)
    : null;

  return {
    status:
      statusId === 3
        ? "passed"
        : statusId === 5
          ? "timeout"
          : statusId === 4
            ? "failed"
            : statusId === 6 || statusId === 7 || statusId === 8 || error
              ? "error"
              : "failed",
    output,
    error,
    runtimeMs,
    memoryKb: typeof execution.memory === "number" ? execution.memory : null,
    judgeStatusId: statusId,
    judgeStatus: statusDescription,
    ...(failureKind ? { failureKind } : {}),
  };
}

export function normalizeJudge0Status(
  execution: Judge0ExecutionLike,
): "PASSED" | "FAILED" | "ERROR" | "TIMEOUT" {
  const normalized = normalizeJudge0Result(execution);
  if (normalized.status === "passed") return "PASSED";
  if (normalized.status === "timeout") return "TIMEOUT";
  if (normalized.status === "failed") return "FAILED";
  return "ERROR";
}
