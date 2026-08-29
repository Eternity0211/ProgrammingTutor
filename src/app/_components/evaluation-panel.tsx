"use client";

import { Activity, Lightbulb, Compass, Heart } from "lucide-react"; // 【修改】：引入图标[cite: 13]
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";

function formatConfidence(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function EvaluationPanel({ submission }: { submission: any }) {
  const noCustomMetrics = Boolean(submission.aiFeedback?.noCustomMetrics);
  const branch = submission.aiFeedback?.branch;
  const branchLabel =
    branch === "code-review-agent"
      ? "深度审查模式（Code Review Agent）"
      : "通用评估模式（General LLM）";
  const confidenceText = noCustomMetrics
    ? null
    : formatConfidence(submission.aiFeedback?.confidence);

  return (
    <Card className="mt-6 rounded-2xl border-border border-purple-200">
      <CardHeader className="bg-purple-50/30">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          <CardTitle>神经符号因果分析</CardTitle>
        </div>
        <CardDescription>结合符号逻辑引擎与多智能体协同诊断</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {submission.aiFeedback ? (
          <>
            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-sky-700">评测结果得分</p>
                <Badge className="bg-sky-500 text-white border-none">
                  {submission.score} 分
                </Badge>
              </div>
            </div>

            {submission.emotion && (
              <div className="rounded-lg border border-pink-100 bg-pink-50/50 p-3 flex items-start gap-3">
                <Heart className="h-4 w-4 text-pink-500 mt-1 flex-shrink-0" />
                <p className="text-sm text-pink-700 italic">
                  {submission.emotion.supportMessage || submission.emotion.content || "正在为你加油！"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> 逻辑缺陷诊断
              </h4>
              {noCustomMetrics ? (
                <p className="text-sm leading-relaxed p-3 bg-muted/50 rounded-lg text-muted-foreground">
                  {submission.aiFeedback?.message ||
                    "本题未配置自定义指标，暂不展示深度分析结果。"}
                </p>
              ) : (
                <div className="space-y-2">
                  {submission.aiFeedback?.reviewSummary && (
                    <p className="text-sm leading-relaxed p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                      {submission.aiFeedback.reviewSummary}
                    </p>
                  )}
                  {submission.aiFeedback?.causalAnalysis && (
                    <p className="text-sm leading-relaxed p-3 bg-muted/50 rounded-lg">
                      {submission.aiFeedback.causalAnalysis}
                    </p>
                  )}
                  {confidenceText && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        分析置信度
                      </span>
                      <Badge variant="secondary">{confidenceText}</Badge>
                    </div>
                  )}
                  {Array.isArray(submission.aiFeedback?.suggestions) &&
                    submission.aiFeedback.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {submission.aiFeedback.suggestions.map(
                          (item: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              # {item}
                            </Badge>
                          ),
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>

            {submission.navigation && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-600">
                  <Compass className="h-4 w-4" /> 学习导航建议
                </h4>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {submission.navigation.learningPath || "基于当前的掌握情况，建议按以下步骤进阶："}
                  </p>
                  {submission.navigation.nextSteps && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {submission.navigation.nextSteps.map((step: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-white text-blue-600 border-blue-200">
                          {step}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            评测中...
          </p>
        )}
      </CardContent>
    </Card>
  );
}