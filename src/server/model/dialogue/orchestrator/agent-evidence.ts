import { createHash } from "crypto";
import type { ChatMessage } from "../types";

export interface AdaptiveAgentEvidence {
  codeReviewResult?: string;
  studentProfileSummary?: string;
  sessionContext?: ChatMessage[];
  knowledgeGraph?: string;
}

export type AdaptiveAgentEvidenceSource =
  | "code-review"
  | "student-profile"
  | "session-context"
  | "knowledge-graph";

function compact(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeAgentEvidence(
  evidence: AdaptiveAgentEvidence,
): AdaptiveAgentEvidence {
  const sessionContext = evidence.sessionContext?.filter((message) =>
    Boolean(message.content.trim()),
  );
  return {
    codeReviewResult: compact(evidence.codeReviewResult),
    studentProfileSummary: compact(evidence.studentProfileSummary),
    sessionContext: sessionContext?.length ? sessionContext : undefined,
    knowledgeGraph: compact(evidence.knowledgeGraph),
  };
}

export function getAgentEvidenceSources(
  evidence: AdaptiveAgentEvidence,
): AdaptiveAgentEvidenceSource[] {
  const normalized = normalizeAgentEvidence(evidence);
  const sources: AdaptiveAgentEvidenceSource[] = [];
  if (normalized.codeReviewResult) sources.push("code-review");
  if (normalized.studentProfileSummary) sources.push("student-profile");
  if (normalized.sessionContext?.length) sources.push("session-context");
  if (normalized.knowledgeGraph) sources.push("knowledge-graph");
  return sources;
}

export function agentEvidenceFingerprint(
  evidence: AdaptiveAgentEvidence,
): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeAgentEvidence(evidence)))
    .digest("hex")
    .slice(0, 16);
}

export interface IndependentAgentTasks<TEmotion, TNavigation> {
  emotion?: () => Promise<TEmotion>;
  navigation?: () => Promise<TNavigation>;
}

export interface IndependentAgentResults<TEmotion, TNavigation> {
  emotion?: PromiseSettledResult<TEmotion>;
  navigation?: PromiseSettledResult<TNavigation>;
}

/**
 * Starts independent downstream agents in the same event-loop turn. A failure in
 * one optional agent is returned to the caller and never cancels the other.
 */
export async function runIndependentAgentTasks<TEmotion, TNavigation>(
  tasks: IndependentAgentTasks<TEmotion, TNavigation>,
): Promise<IndependentAgentResults<TEmotion, TNavigation>> {
  const emotionPromise = tasks.emotion?.();
  const navigationPromise = tasks.navigation?.();
  const [emotion, navigation] = await Promise.all([
    emotionPromise
      ? Promise.resolve(emotionPromise).then(
          (value): PromiseSettledResult<TEmotion> => ({
            status: "fulfilled",
            value,
          }),
          (reason): PromiseSettledResult<TEmotion> => ({
            status: "rejected",
            reason,
          }),
        )
      : undefined,
    navigationPromise
      ? Promise.resolve(navigationPromise).then(
          (value): PromiseSettledResult<TNavigation> => ({
            status: "fulfilled",
            value,
          }),
          (reason): PromiseSettledResult<TNavigation> => ({
            status: "rejected",
            reason,
          }),
        )
      : undefined,
  ]);
  return { emotion, navigation };
}
