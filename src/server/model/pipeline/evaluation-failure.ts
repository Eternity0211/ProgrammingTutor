export type EvaluationFailureScope = "student" | "platform";

export type EvaluationFailureKind =
  | "symbolic"
  | "compile"
  | "runtime"
  | "timeout"
  | "judge0_unavailable"
  | "llm_unavailable"
  | "invalid_model_output"
  | "database_unavailable"
  | "graph_unavailable"
  | "configuration"
  | "internal";

export class EvaluationPlatformError extends Error {
  readonly scope = "platform" as const;

  constructor(
    message: string,
    readonly kind: Exclude<
      EvaluationFailureKind,
      "symbolic" | "compile" | "runtime" | "timeout"
    >,
    readonly retryable = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EvaluationPlatformError";
  }
}

export class EvaluationRunPlatformError extends EvaluationPlatformError {
  constructor(
    source: EvaluationPlatformError,
    readonly evaluationRunId: string,
    readonly codeSubmissionId: string,
  ) {
    super(source.message, source.kind, source.retryable, { cause: source });
    this.name = "EvaluationRunPlatformError";
  }
}

export function classifyEvaluationError(error: unknown): {
  scope: EvaluationFailureScope;
  kind: EvaluationFailureKind;
  retryable: boolean;
  message: string;
} {
  if (error instanceof EvaluationPlatformError) {
    return {
      scope: error.scope,
      kind: error.kind,
      retryable: error.retryable,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    scope: "platform",
    kind: "internal",
    retryable: false,
    message,
  };
}
