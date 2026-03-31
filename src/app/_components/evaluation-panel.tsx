"use client";

import { Activity, Lightbulb } from "lucide-react";
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
        <CardDescription>结合符号逻辑引擎深度扫描结果</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {submission.aiFeedback ? (
          <>
            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-sky-700">评估分支</p>
                <Badge className="bg-sky-100 text-sky-800 border-none">
                  {branchLabel}
                </Badge>
              </div>
            </div>

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
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            评估中...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
