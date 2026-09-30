export function resolveAssignmentQuestionIndex(
  questionIds: string[],
  requestedQuestionId: string | null | undefined,
): number {
  if (!requestedQuestionId) return 0;
  const index = questionIds.indexOf(requestedQuestionId);
  return index >= 0 ? index : 0;
}

export function buildAssignmentQuestionUrl(
  pathname: string,
  currentSearch: string,
  questionId: string,
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("question", questionId);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
