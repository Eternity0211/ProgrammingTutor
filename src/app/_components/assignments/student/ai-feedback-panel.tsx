"use client";

import { BrainCircuit, Heart, Lightbulb, Loader2 } from "lucide-react";
import { Card } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import Link from "next/link";
import { AIFeedback } from "@/lib/types/code-types";
import { LearningNavigationResult } from "@/server/model/neural/navigationAgent";
import { EmotionAnalysisResult } from "@/server/model/neural/emotionAgent";

type AIFeedbackPanelProps = {
  aiAnalysis: AIFeedback | null;
  emotion: EmotionAnalysisResult | null;
  navigation: LearningNavigationResult | null;
  isRunning: boolean;
};

function formatConfidence(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function AIFeedbackPanel({
  aiAnalysis,
  emotion,
  navigation,
  isRunning,
}: AIFeedbackPanelProps) {
  const noCustomMetrics = Boolean(aiAnalysis?.noCustomMetrics);
  const branch = aiAnalysis?.branch;
  const branchLabel =
    branch === "code-review-agent"
      ? "深度审查模式（Code Review Agent）"
      : "通用评估模式（General LLM）";
  const branchHint =
    branch === "code-review-agent"
      ? "本次结果来自神经侧代码审查智能体，包含更细粒度的逻辑反馈。"
      : "本次结果来自通用评估分支，适合快速反馈；可在提交历史查看更完整上下文。";
  const confidenceText = noCustomMetrics
    ? null
    : formatConfidence(aiAnalysis?.confidence);
  const weaknesses = navigation?.learning_navigation?.weaknesses || [];
  const learningPath = navigation?.learning_navigation?.learning_path || [];
  const recommendedExercises =
    navigation?.learning_navigation?.recommended_exercises || [];

  if (isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-purple-500" />
        <p className="text-sm font-medium">AI 导师正在进行符号逻辑追踪...</p>
      </div>
    );
  }

  if (!aiAnalysis && !emotion && !navigation) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
        提交代码后，AI 将在此为你分析逻辑缺陷并提供陪伴。
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-700">
      {/* 0. 评估分支提示 */}
      {aiAnalysis && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold tracking-wide text-sky-700 uppercase">
              评估分支
            </p>
            <Badge className="bg-sky-100 text-sky-800 border-none">
              {branchLabel}
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-sky-800">
            {noCustomMetrics
              ? aiAnalysis.message ||
                "本题未配置自定义指标，暂不展示置信度与深度分析结果。"
              : branchHint}
          </p>
        </div>
      )}

      {/* 1. 情绪陪伴卡片 */}
      {emotion?.emotion_analysis && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex gap-4 shadow-sm">
          <div className="bg-indigo-500 p-2 rounded-full shrink-0 h-fit">
            <Heart className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-indigo-600 mb-1 tracking-wider uppercase">
              AI 陪伴助手
            </p>
            <p className="text-sm italic text-foreground/90 font-medium leading-relaxed">
              "{emotion.emotion_analysis.supportive_guidance}"
            </p>
          </div>
        </div>
      )}

      {/* 2. AI 代码逻辑分析 */}
      {aiAnalysis && !noCustomMetrics && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
            <BrainCircuit className="h-5 w-5" />
            逻辑缺陷因果分析
          </div>
          {aiAnalysis.reviewSummary && (
            <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1">
                本次审查总结
              </p>
              <p className="text-sm leading-relaxed text-purple-900">
                {aiAnalysis.reviewSummary}
              </p>
            </div>
          )}
          {aiAnalysis.causalAnalysis && (
            <div className="text-sm leading-relaxed text-muted-foreground bg-white dark:bg-zinc-900 p-4 rounded-lg border border-border shadow-sm">
              {aiAnalysis.causalAnalysis}
            </div>
          )}
          {confidenceText && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">分析置信度</span>
              <Badge variant="secondary">{confidenceText}</Badge>
            </div>
          )}
          {Array.isArray(aiAnalysis.suggestions) &&
            aiAnalysis.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.suggestions.map((tip: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-none"
                  >
                    # {tip}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      )}

      {/* 3. 知识图谱推荐 */}
      {navigation?.learning_navigation && (
        <div className="pt-4 border-t border-border">
          {weaknesses.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-xs font-bold text-amber-700 mb-2">
                薄弱点识别
              </p>
              <div className="flex flex-wrap gap-2">
                {weaknesses.map((item: string, idx: number) => (
                  <Badge
                    key={`${item}-${idx}`}
                    className="bg-amber-100 text-amber-800 border-none"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {learningPath.length > 0 && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-3">
              <p className="text-xs font-bold text-emerald-700">学习路径</p>
              {learningPath.map((step, idx) => (
                <div
                  key={`${step.step}-${idx}`}
                  className="rounded-md bg-white/80 p-3 border border-emerald-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-900">
                      Step {step.step} · {step.topic}
                    </p>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none">
                      {step.duration}
                    </Badge>
                  </div>
                  {step.resources?.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-xs text-emerald-900/90 space-y-1">
                      {step.resources.map((res, ridx) => (
                        <li key={`${res}-${ridx}`}>{res}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm font-bold text-orange-600 mb-4">
            <Lightbulb className="h-5 w-5" />
            针对性练习推荐
          </div>
          <div className="grid gap-3">
            {recommendedExercises.map((ex) => (
              <Link
                key={ex.id}
                href={`/exercise/${ex.id}`}
                className="block group"
              >
                <Card className="p-4 group-hover:border-orange-400 transition-all border-dashed bg-orange-50/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{ex.title}</span>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                      {ex.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {ex.purpose}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
