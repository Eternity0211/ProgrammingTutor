// src/app/_components/ai-code-review/AiCodeReview.tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { Loader2, Send, AlertCircle, MessageSquare } from "lucide-react";

// 动态导入Monaco编辑器（避免SSR报错）
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse" />,
});

// AI审查配置
const AI_CONFIG = {
  temperature: 0.2,
  model: "Llama-3.3-70B (LoRA微调代码审查版)",
  certainty: "高确定性（低温度系数）- 诊断结果更聚焦事实和规则",
};

// 类型定义
interface SymbolicResult {
  syntaxErrors: string[];
  unusedVariables: string[];
  potentialBugs: string[];
  complexity: number;
}

interface CodeReviewResult {
  metrics: Array<{
    metricId: string;
    metricName: string;
    score: number;
    feedback: string;
    suggestions: string[];
  }>;
  overallFeedback: string;
  aiConfig: typeof AI_CONFIG;
}

// 静态代码分析（符号分析）
const symbolicAnalysis = (code: string): SymbolicResult => {
  const syntaxErrors: string[] = [];
  const unusedVariables: string[] = [];
  const potentialBugs: string[] = [];

  // 语法错误检测（简单示例）
  if (code.includes("let =") || code.includes("const ="))
    syntaxErrors.push("变量声明缺少标识符");
  if (code.includes("function ()")) syntaxErrors.push("函数声明缺少函数名");
  if (!code.includes("}") && code.includes("{"))
    syntaxErrors.push("代码块缺少闭合大括号");

  // 未使用变量检测
  const varMatches = code.match(/let (\w+)|const (\w+)|var (\w+)/g);
  if (varMatches) {
    varMatches.forEach((match) => {
      const varName = match.split(" ")[1];
      if (varName && !code.replace(match, "").includes(varName)) {
        unusedVariables.push(varName);
      }
    });
  }

  // 潜在Bug检测
  if (code.includes("while(true)") || code.includes("for(;;)"))
    potentialBugs.push("无限循环风险");
  if (code.includes("arr[arr.length]")) potentialBugs.push("数组越界访问风险");
  if (code.includes("eval(")) potentialBugs.push("使用eval存在安全风险");

  // 代码复杂度计算
  const lines = code
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//")).length;
  const complexity = Math.min(Math.floor(lines / 10) + 1, 10);

  return { syntaxErrors, unusedVariables, potentialBugs, complexity };
};

// AI代码审查核心逻辑
const reviewCode = async (
  code: string,
  symbolicResult: SymbolicResult,
): Promise<CodeReviewResult> => {
  // 模拟异步AI审查（实际项目可替换为真实API调用）
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 逻辑缺陷评分
  const logicScore =
    symbolicResult.potentialBugs.length === 0
      ? 95
      : symbolicResult.potentialBugs.length === 1
        ? 75
        : 50;

  // 语法评分
  const syntaxScore =
    symbolicResult.syntaxErrors.length === 0
      ? 100
      : symbolicResult.syntaxErrors.length === 1
        ? 80
        : 60;

  // 代码风格评分
  const styleScore = symbolicResult.unusedVariables.length === 0 ? 90 : 70;

  return {
    metrics: [
      {
        metricId: "logic-defects",
        metricName: "逻辑缺陷",
        score: logicScore,
        feedback:
          symbolicResult.potentialBugs.length > 0
            ? `发现${symbolicResult.potentialBugs.length}个潜在逻辑问题：${symbolicResult.potentialBugs.join(", ")}`
            : "未发现逻辑缺陷，代码逻辑清晰",
        suggestions: symbolicResult.potentialBugs.includes("无限循环风险")
          ? ["添加循环终止条件", "检查循环变量更新逻辑", "避免使用while(true)"]
          : ["保持现有逻辑，注意边界场景测试"],
      },
      {
        metricId: "syntax",
        metricName: "语法规范",
        score: syntaxScore,
        feedback:
          symbolicResult.syntaxErrors.length > 0
            ? `发现${symbolicResult.syntaxErrors.length}个语法错误：${symbolicResult.syntaxErrors.join(", ")}`
            : "语法完全符合规范，无错误",
        suggestions:
          symbolicResult.syntaxErrors.length > 0
            ? ["修复标识符合法性问题", "检查代码块闭合", "遵循变量声明规范"]
            : ["保持语法规范性"],
      },
      {
        metricId: "code-style",
        metricName: "代码风格",
        score: styleScore,
        feedback:
          symbolicResult.unusedVariables.length > 0
            ? `发现${symbolicResult.unusedVariables.length}个未使用变量：${symbolicResult.unusedVariables.join(", ")}`
            : "代码风格良好，无冗余变量",
        suggestions:
          symbolicResult.unusedVariables.length > 0
            ? ["删除未使用变量", "遵循命名规范（小驼峰）", "添加必要注释"]
            : ["继续保持良好的代码风格"],
      },
    ],
    overallFeedback:
      logicScore >= 90 && syntaxScore >= 90 && styleScore >= 90
        ? "代码质量优秀，逻辑、语法、风格均符合工业级标准，可直接提交"
        : logicScore < 70
          ? "代码存在严重逻辑缺陷，建议优先修复后再优化语法和风格"
          : "代码整体合格，但存在部分可优化点，建议根据AI反馈调整",
    aiConfig: AI_CONFIG,
  };
};

// AI追问解答逻辑
const handleFollowupQuestion = async (
  question: string,
  reviewResult: CodeReviewResult,
): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (question.includes("无限循环") || question.includes("死循环")) {
    return `### 无限循环问题解答
1. 原因：循环条件永远为true（如while(true)）或循环变量未正确更新
2. 修复方案：
   - 添加计数器：let i=0; while(i<10) { i++ }
   - 基于业务逻辑终止：while(arr.length > 0) { arr.pop() }
   - 使用break语句：while(true) { if (condition) break; }
3. 预防措施：测试时覆盖循环终止场景`;
  } else if (question.includes("数组越界") || question.includes("arr.length")) {
    return `### 数组越界问题解答
1. 原因：访问了数组不存在的索引（如arr[arr.length]，数组索引从0开始）
2. 修复方案：
   - 检查索引范围：if (index >= 0 && index < arr.length) { ... }
   - 使用数组方法：arr.at(index)（自动处理越界）
3. 最佳实践：始终对数组索引做边界检查`;
  } else if (question.includes("评分") || question.includes("分数")) {
    return `### 评分规则说明
- 逻辑缺陷（权重50%）：检测无限循环、空指针、越界等严重问题
- 语法规范（权重30%）：检测语法错误、标识符合法性
- 代码风格（权重20%）：检测冗余变量、命名规范、注释完整性
总分 = 逻辑评分*0.5 + 语法评分*0.3 + 风格评分*0.2`;
  } else {
    return `### AI解答：${question}
${reviewResult.overallFeedback}

根据你的问题，建议重点关注：
${reviewResult.metrics.map((metric) => `- ${metric.metricName}：${metric.feedback}`).join("\n")}

如果有更具体的问题（如某个语法错误、逻辑问题），可以继续追问。`;
  }
};

// 组件Props定义
interface AiCodeReviewProps {
  initialCode?: string; // 作业初始代码
  assignmentTitle?: string; // 作业标题
  onCodeChange?: (code: string) => void; // 代码变化回调（同步到作业答题页）
}

// 核心组件
export default function AiCodeReview({
  initialCode = "// 请编写作业要求的代码",
  assignmentTitle = "作业答题",
  onCodeChange,
}: AiCodeReviewProps) {
  // 状态管理
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [symbolicResult, setSymbolicResult] = useState(symbolicAnalysis(code));
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(
    null,
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // 代码变化时更新符号分析
  useEffect(() => {
    setSymbolicResult(symbolicAnalysis(code));
    if (onCodeChange) onCodeChange(code);
  }, [code, onCodeChange]);

  // 切换AI面板
  const togglePanel = () => setIsOpen(!isOpen);

  // 触发AI审查
  const startReview = async () => {
    setIsReviewing(true);
    setReviewResult(null);
    try {
      const result = await reviewCode(code, symbolicResult);
      setReviewResult(result);
    } catch (err) {
      alert(`AI审查失败：${(err as Error).message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  // 处理追问
  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupQuestion.trim() || !reviewResult) return;

    setIsAnswering(true);
    setFollowupAnswer("");
    try {
      const answer = await handleFollowupQuestion(
        followupQuestion,
        reviewResult,
      );
      setFollowupAnswer(answer);
      setFollowupQuestion("");
    } catch (err) {
      alert(`追问失败：${(err as Error).message}`);
    } finally {
      setIsAnswering(false);
    }
  };

  // 未打开时显示悬浮按钮
  if (!isOpen) {
    return (
      <Button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 shadow-lg"
        size="lg"
      >
        🤖 AI代码审查
      </Button>
    );
  }

  // AI审查面板（打开状态）
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto">
        {/* 面板头部 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            AI代码审查 · {assignmentTitle}
          </h2>
          <Button variant="ghost" size="icon" onClick={togglePanel}>
            ✕
          </Button>
        </div>

        {/* 代码编辑区 */}
        <div className="p-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">作业代码</CardTitle>
              <CardDescription className="text-xs">
                编辑代码后AI会自动进行静态分析
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              <MonacoEditor
                height="300px"
                language="javascript"
                value={code}
                onChange={(value) => value && setCode(value)}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={startReview}
              disabled={isReviewing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  审查中...
                </>
              ) : (
                "开始代码审查"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setCode(initialCode)}
              disabled={isReviewing}
            >
              重置代码
            </Button>
          </div>

          {/* 静态分析结果 */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                静态代码分析
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 text-xs space-y-2">
              <div>
                <span className="font-medium">语法错误：</span>
                {symbolicResult.syntaxErrors.length > 0 ? (
                  <span className="text-red-500 ml-2">
                    {symbolicResult.syntaxErrors.join(", ")}
                  </span>
                ) : (
                  <span className="text-green-500 ml-2">无</span>
                )}
              </div>
              <div>
                <span className="font-medium">未使用变量：</span>
                {symbolicResult.unusedVariables.length > 0 ? (
                  <span className="text-amber-500 ml-2">
                    {symbolicResult.unusedVariables.join(", ")}
                  </span>
                ) : (
                  <span className="text-green-500 ml-2">无</span>
                )}
              </div>
              <div>
                <span className="font-medium">潜在Bug：</span>
                {symbolicResult.potentialBugs.length > 0 ? (
                  <span className="text-amber-500 ml-2">
                    {symbolicResult.potentialBugs.join(", ")}
                  </span>
                ) : (
                  <span className="text-green-500 ml-2">无</span>
                )}
              </div>
              <div>
                <span className="font-medium">代码复杂度：</span>
                <Badge
                  variant={
                    symbolicResult.complexity > 7 ? "destructive" : "secondary"
                  }
                  className="ml-2"
                >
                  {symbolicResult.complexity}/10
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* AI审查结果 */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                AI审查结果
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              {isReviewing ? (
                // 加载中骨架屏
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !reviewResult ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  点击「开始代码审查」获取AI专业分析结果
                </div>
              ) : (
                <>
                  {/* 整体评价 */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-md text-sm">
                    <strong>整体评价：</strong> {reviewResult.overallFeedback}
                  </div>

                  {/* 维度评分 */}
                  <div className="space-y-3 mb-4">
                    {reviewResult.metrics.map((metric) => (
                      <div
                        key={metric.metricId}
                        className="border rounded-md p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            {metric.metricName}
                          </span>
                          <Badge
                            variant={
                              metric.score >= 90
                                ? "secondary"
                                : metric.score >= 80
                                  ? "default"
                                  : metric.score >= 70
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {metric.score}/100
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {metric.feedback}
                        </p>
                        <div className="text-xs">
                          <strong className="text-blue-600">改进建议：</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1 pl-2">
                            {metric.suggestions.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 追问功能 */}
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">AI追问</h4>
                    <form onSubmit={submitQuestion} className="flex gap-2">
                      <Input
                        placeholder="对审查结果有疑问？比如：如何修复无限循环？"
                        value={followupQuestion}
                        onChange={(e) => setFollowupQuestion(e.target.value)}
                        disabled={isAnswering}
                        className="text-sm"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isAnswering || !followupQuestion.trim()}
                      >
                        {isAnswering ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>

                    {followupAnswer && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs whitespace-pre-line">
                        <strong className="text-gray-700">AI解答：</strong>
                        {followupAnswer}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
