import { z } from "zod";

export class AgentOutputValidationError extends Error {
  constructor(agent: string, details: string) {
    super(`${agent} returned invalid output: ${details}`);
    this.name = "AgentOutputValidationError";
  }
}

const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })
  .passthrough();

export const codeReviewAgentInputSchema = z.object({
  code: z.string().min(1),
  language: z.string(),
  symbolic: z.unknown(),
  testSummary: z.unknown(),
  studentProfileSummary: z.string(),
  sessionContext: z.array(chatMessageSchema),
});

export const emotionAgentInputSchema = z
  .object({
    codeReviewResult: z.string().min(1).optional(),
    studentProfileSummary: z.string().min(1).optional(),
    sessionContext: z.array(chatMessageSchema).optional(),
  })
  .refine(
    (input) =>
      Boolean(
        input.codeReviewResult ||
          input.studentProfileSummary ||
          input.sessionContext?.length,
      ),
    { message: "emotion agent requires at least one evidence source" },
  );

export const navigationAgentInputSchema = z
  .object({
    codeReviewResult: z.string().min(1).optional(),
    knowledgeGraph: z.string().min(1).optional(),
    studentHistory: z.string().optional(),
    studentProfileSummary: z.string().min(1).optional(),
    sessionContext: z.array(chatMessageSchema).optional(),
  })
  .refine(
    (input) =>
      Boolean(
        input.codeReviewResult ||
          input.studentHistory ||
          input.studentProfileSummary ||
          input.sessionContext?.length,
      ),
    {
      message: "navigation agent requires at least one student evidence source",
    },
  );

export const codeReviewAgentResultSchema = z.object({
  reviewSummary: z.string().min(1),
  causalAnalysis: z.string().min(1),
  suggestions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const emotionAgentResultSchema = z.object({
  detected_emotion: z.string().min(1),
  intensity: z.enum(["弱", "中", "强"]),
  reason: z.string().min(1),
  supportive_guidance: z.string().min(1),
});

export const emotionAgentEnvelopeSchema = z.object({
  emotion_analysis: emotionAgentResultSchema,
});

export const navigationAgentResultSchema = z.object({
  weaknesses: z.array(z.string()),
  learning_path: z.array(
    z.object({
      step: z.number(),
      topic: z.string(),
      duration: z.string(),
      resources: z.array(z.string()),
    }),
  ),
  recommended_exercises: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      difficulty: z.enum(["入门", "初级", "中级", "高级"]),
      purpose: z.string(),
      url: z.string(),
    }),
  ),
});

export const navigationAgentEnvelopeSchema = z.object({
  learning_navigation: navigationAgentResultSchema,
});
