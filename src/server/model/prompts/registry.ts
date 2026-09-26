import { createHash } from "crypto";

export interface PromptDefinition {
  id: string;
  version: string;
  owner: string;
  purpose: string;
  contract: string;
  fingerprint: string;
}

function definePrompt(
  definition: Omit<PromptDefinition, "fingerprint">,
): PromptDefinition {
  return Object.freeze({
    ...definition,
    fingerprint: createHash("sha256")
      .update(definition.contract)
      .digest("hex")
      .slice(0, 16),
  });
}

const definitions = [
  definePrompt({
    id: "dialogue.intent-classification",
    version: "1.0.0",
    owner: "dialogue",
    purpose: "Classify a student message into one supported dialogue intent.",
    contract: "Return strict JSON with intent, confidence, and extracted entities.",
  }),
  definePrompt({
    id: "dialogue.reply",
    version: "1.0.0",
    owner: "dialogue",
    purpose: "Generate the final student-facing tutor response.",
    contract: "Use supplied profile, session, and validated agent context; be concise, friendly, and encouraging.",
  }),
  definePrompt({
    id: "dialogue.session-summary",
    version: "1.0.0",
    owner: "dialogue",
    purpose: "Compress old conversation turns.",
    contract: "Produce a Chinese summary under 200 characters preserving code issues, emotion, concepts, and learning needs.",
  }),
  definePrompt({
    id: "dialogue.session-title",
    version: "1.0.0",
    owner: "dialogue",
    purpose: "Generate a short conversation title.",
    contract: "Return title text only, at most 20 Chinese characters, without quotes or punctuation.",
  }),
  definePrompt({
    id: "rag.grounded-answer",
    version: "1.0.0",
    owner: "rag",
    purpose: "Answer a programming question using retrieved evidence only.",
    contract: "Return strict JSON with answer and citations; every factual claim must cite a supplied S-number and no outside facts are allowed.",
  }),
  definePrompt({
    id: "agent.code-review",
    version: "1.0.0",
    owner: "code-review-agent",
    purpose: "Explain code defects using symbolic and runtime evidence.",
    contract: "Return strict code-review JSON; prioritize symbolic evidence and provide executable suggestions with confidence in [0,1].",
  }),
  definePrompt({
    id: "agent.emotion-support",
    version: "1.0.0",
    owner: "emotion-agent",
    purpose: "Infer learning emotion and provide a safe next action.",
    contract: "Return strict emotion_analysis JSON; avoid blame, avoid diagnosis, and include one immediately executable action.",
  }),
  definePrompt({
    id: "agent.learning-navigation",
    version: "1.0.0",
    owner: "navigation-agent",
    purpose: "Build a learning path from validated review evidence.",
    contract: "Return strict learning_navigation JSON; exercise recommendations must come from the supplied catalog.",
  }),
] as const;

const registry = new Map(definitions.map((definition) => [definition.id, definition]));

export function getPromptDefinition(id: string): PromptDefinition {
  const definition = registry.get(id);
  if (!definition) throw new Error(`Unknown prompt definition: ${id}`);
  return definition;
}

export function listPromptDefinitions(): PromptDefinition[] {
  return [...definitions];
}

export function promptContractHeader(id: string): string {
  const definition = getPromptDefinition(id);
  return `[prompt:${definition.id}@${definition.version}; fingerprint:${definition.fingerprint}]`;
}

export function promptTraceAttributes(id: string): Record<string, string> {
  const definition = getPromptDefinition(id);
  return {
    promptId: definition.id,
    promptVersion: definition.version,
    promptFingerprint: definition.fingerprint,
  };
}
