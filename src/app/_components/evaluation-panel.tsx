"use client";

import { useState } from "react";
import { Activity, Lightbulb, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";

export function EvaluationPanel({ submission }: { submission: any }) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;

    setIsAsking(true);
    // 模拟调用 codeAgent 接口
    setTimeout(() => {
      setFollowUpAnswer(
        `针对你的问题「${followUpQuestion}」：${submission.aiFeedback?.causalAnalysis || "分析完成"}`,
      );
      setIsAsking(false);
      setFollowUpQuestion("");
    }, 1500);
  };

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
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> 逻辑缺陷诊断
              </h4>
              <p className="text-sm leading-relaxed p-3 bg-muted/50 rounded-lg">
                {submission.aiFeedback.causalAnalysis ||
                  "未检测到明显逻辑缺陷。"}
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />{" "}
                对分析结果追问
              </h4>
              <form onSubmit={handleFollowUpSubmit} className="space-y-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="例如：为什么这个循环会越界？"
                  className="w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
                  disabled={isAsking}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAsking || !followUpQuestion.trim()}
                >
                  {isAsking ? "追问中..." : "提交追问"}
                </Button>
              </form>
              {followUpAnswer && (
                <div className="mt-2 p-3 bg-blue-50/30 rounded-lg text-sm border border-blue-100">
                  <p className="text-blue-800">{followUpAnswer}</p>
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
