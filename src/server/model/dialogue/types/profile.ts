export interface CodeSubmissionRecord {
  questionId: string;
  score: number;
  concepts: string[];
  timestamp: number;
}

export interface EmotionStat {
  emotion: string;
  count: number;
  lastIntensity: "弱" | "中" | "强";
  lastTimestamp: number;
}

export interface StudentProfile {
  userId: string;
  codeSubmissionRecords: CodeSubmissionRecord[];
  weakKnowledgePoints: string[];
  emotionStats: EmotionStat[];
  updatedAt: number;
}
