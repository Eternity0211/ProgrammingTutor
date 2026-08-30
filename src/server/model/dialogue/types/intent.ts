export type DialogueIntent =
  | "CODE_SUBMISSION"
  | "EMOTIONAL_VENTING"
  | "LEARNING_PATH_INQUIRY"
  | "KNOWLEDGE_QUESTION"
  | "THOUGHT_FOLLOWUP";

export interface ExtractedEntities {
  codeSnippet?: string;
  language?: string;
  knowledgeKeywords?: string[];
  emotionKeywords?: string[];
  referencedTopic?: string;
}

export interface IntentRecognitionResult {
  intent: DialogueIntent;
  confidence: number;
  entities: ExtractedEntities;
  rawText: string;
}
