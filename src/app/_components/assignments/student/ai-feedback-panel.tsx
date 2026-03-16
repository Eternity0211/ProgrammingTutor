"use client";

import { BrainCircuit, Heart, Lightbulb, Loader2 } from "lucide-react";
import { Card } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import Link from "next/link";

export function AIFeedbackPanel({
  aiAnalysis,
  emotion,
  navigation,
  isRunning,
}: any) {
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
      {aiAnalysis && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
            <BrainCircuit className="h-5 w-5" />
            逻辑缺陷因果分析
          </div>
          <div className="text-sm leading-relaxed text-muted-foreground bg-white dark:bg-zinc-900 p-4 rounded-lg border border-border shadow-sm">
            {aiAnalysis.causalAnalysis}
          </div>
          <div className="flex flex-wrap gap-2">
            {aiAnalysis.suggestions?.map((tip: string, idx: number) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-none"
              >
                # {tip}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 3. 知识图谱推荐 */}
      {navigation?.learning_navigation && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-bold text-orange-600 mb-4">
            <Lightbulb className="h-5 w-5" />
            针对性练习推荐
          </div>
          <div className="grid gap-3">
            {navigation.learning_navigation.recommended_exercises.map(
              (ex: any) => (
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
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
