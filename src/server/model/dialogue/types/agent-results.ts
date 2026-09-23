import { z } from "zod";

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
