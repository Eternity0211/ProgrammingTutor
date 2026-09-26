export const LATEST_EVALUATION_REFERENCE_KEY =
  "programming_tutor_latest_evaluation";

export interface EvaluationReference {
  evaluationRunId: string;
  codeSubmissionId: string;
}

export function saveEvaluationReference(
  storage: Pick<Storage, "setItem">,
  reference: EvaluationReference,
): void {
  storage.setItem(LATEST_EVALUATION_REFERENCE_KEY, JSON.stringify(reference));
}

export function readEvaluationReference(
  storage: Pick<Storage, "getItem">,
): EvaluationReference | null {
  const raw = storage.getItem(LATEST_EVALUATION_REFERENCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EvaluationReference>;
    if (
      typeof parsed.evaluationRunId !== "string" ||
      typeof parsed.codeSubmissionId !== "string"
    ) {
      return null;
    }
    return {
      evaluationRunId: parsed.evaluationRunId,
      codeSubmissionId: parsed.codeSubmissionId,
    };
  } catch {
    return null;
  }
}
