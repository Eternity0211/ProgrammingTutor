import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  BrainCircuit,
  Activity,
  Lightbulb,
  Heart,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getSubmissions,
  // getSubmissionsById,
} from "@/server/actions/submission-actions";
import { LanguageIcon } from "@/app/_components/ui/language-icon";
import { Language } from "@/lib/types/config-types";

import { getSubmissionsById } from "@/server/actions/submission-actions";
import { EvaluationPanel } from "@/app/_components/evaluation-panel";
import { SubmissionStatus, Prisma } from "@prisma/client";

// const mockSession = {
//   user: {
//     id: "cmm7nkq9t0000mn31rs1w484m", // 替换成你数据库里用户记录的真实ID
//     role: "STUDENT", // 和数据库里的角色一致（如 STUDENT/ADMIN）
//     onboarded: true,
//   },
//   expires: new Date(Date.now() + 86400000).toISOString(), // 有效期1天
// };
// // 覆盖登录校验方法，跳过登录
// const getServerSession = async () => mockSession;

// // 2. 模拟 getSubmissionsById 方法（替换真实接口，避免数据库请求）
// const getSubmissionsById = async (submissionId: string) => {
//   // 返回补全所有字段的Mock数据（包含神经符号分析/情绪反馈/推荐练习）
//   return {
//     submission: {
//       id: submissionId,
//       questionTitle: "测试题目：数组求和",
//       code: "int main() { int a[5]; a[5] = 10; return 0; }",
//       submittedAt: new Date(),
//       status: "PARTIAL",
//       score: 50,
//       language: "cpp",
//       testCaseResults: [
//         {
//           id: "tc1",
//           status: "PASSED",
//           testCase: { input: "1+2", expectedOutput: "3" },
//           actualOutput: "3",
//           executionTime: 100, // 新增：补全缺失的 executionTime 字段
//           errorMessage: "",
//         },
//         {
//           id: "tc2",
//           status: "FAILED",
//           testCase: { input: "3+4", expectedOutput: "7" },
//           errorMessage: "数组越界",
//           actualOutput: "", // 补全字段，保持类型统一
//           executionTime: 50,
//         },
//       ],
//       // 神经符号分析字段
//       aiFeedback: {
//         causalAnalysis: "代码存在数组越界逻辑缺陷：数组a长度为5，索引范围0-4，但访问了a[5]，导致内存非法访问",
//         suggestions: ["将a[5]改为a[4]", "添加数组边界检查逻辑"],
//       },
//       // 情绪反馈字段
//       emotion: {
//         emotion_analysis: {
//           supportive_guidance: "别灰心！数组越界是新手最常见的错误之一，先把索引改成4试试～",
//         },
//       },
//       // 推荐练习字段
//       recommendedQuestions: [
//         { assignmentId: "assign-002", title: "数组边界检查专项练习", difficulty: "中等" },
//         { assignmentId: "assign-003", title: "C++ vector 安全使用", difficulty: "简单" },
//       ],
//     },
//   };
// };

interface TestCaseResult {
  id: string;
  status: "PASSED" | "FAILED" | "PENDING" | "ERROR" | "TIMEOUT";
  testCase: {
    input: string;
    expectedOutput: string;
    hidden?: boolean;
  };
  actualOutput: string | null;
  executionTime: number | null;
  errorMessage: string | null;
}

interface AIFeedback {
  branch?: string;
  noCustomMetrics?: boolean;
  message?: string;
  reviewSummary?: string;
  causalAnalysis?: string;
  suggestions?: string[];
  confidence?: number;
}

interface EmotionAnalysis {
  emotion_analysis: {
    supportive_guidance: string;
  };
}

interface RecommendedQuestion {
  assignmentId: string;
  title: string;
  difficulty: "简单" | "中等" | "困难";
}

interface FormattedSubmission {
  id: string;
  studentId: string;
  questionId: string;
  questionTitle: string;
  code: string;
  submittedAt: Date;
  status: SubmissionStatus;
  score: number;
  language: string;
  testCaseResults: TestCaseResult[];
  totalTestCases?: number;
  passedTestCases?: number;
  evaluationStatus?: string;
  aiFeedback: Prisma.JsonValue | null;
  emotion: Prisma.JsonValue | null;
  recommendedQuestions: Prisma.JsonValue | null;
}

interface GetSubmissionsByIdResponse {
  status: "success" | "failed";
  message?: string;
  submission?: FormattedSubmission;
}

// 3. 页面最终使用的 Submission 类型（转换后）
interface Submission {
  id: string;
  questionTitle: string;
  code: string;
  submittedAt: Date;
  status: "COMPLETED" | "FAILED" | "PARTIAL" | "IN_PROGRESS";
  score: number;
  language: Language;
  testCaseResults: TestCaseResult[];
  totalTestCases: number;
  passedTestCases: number;
  aiFeedback?: AIFeedback;
  emotion?: EmotionAnalysis;
  recommendedQuestions?: RecommendedQuestion[];
}

export const metadata: Metadata = {
  title: "评估报告详情 | gradeIT",
  description: "查看代码的神经符号分析结果",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{
    assignmentId: string;
    classCode: string;
    submissionId: string;
  }>;
}) {
  const {
    assignmentId,
    classCode,
    submissionId: codeSubmissionId,
  } = await params;

  try {
    const response = (await getSubmissionsById(
      codeSubmissionId,
    )) as GetSubmissionsByIdResponse;
    console.log("submissionId:", codeSubmissionId);
    console.log("查询结果 submission:", response);

    if (response.status === "failed" || !response.submission) {
      notFound();
    }

    // 第二步：安全转换类型（核心修复）
    const rawSubmission = response.submission;
    const submission: Submission = {
      id: rawSubmission.id,
      questionTitle: rawSubmission.questionTitle,
      code: rawSubmission.code,
      submittedAt: rawSubmission.submittedAt,
      // 转换 Prisma 枚举到页面字符串类型
      status: rawSubmission.status as
        | "COMPLETED"
        | "FAILED"
        | "PARTIAL"
        | "IN_PROGRESS",
      score: rawSubmission.score,
      // 转换语言字段到 Language 类型
      language: rawSubmission.language as Language,
      testCaseResults: rawSubmission.testCaseResults,
      totalTestCases:
        typeof rawSubmission.totalTestCases === "number"
          ? rawSubmission.totalTestCases
          : rawSubmission.testCaseResults.length,
      passedTestCases:
        typeof rawSubmission.passedTestCases === "number"
          ? rawSubmission.passedTestCases
          : rawSubmission.testCaseResults.filter((tc) => tc.status === "PASSED")
              .length,
      // 关键：用 unknown 中转，解决 JsonValue 到自定义类型的转换报错
      aiFeedback: rawSubmission.aiFeedback
        ? (rawSubmission.aiFeedback as unknown as AIFeedback)
        : undefined,
      emotion: rawSubmission.emotion
        ? (rawSubmission.emotion as unknown as EmotionAnalysis)
        : undefined,
      recommendedQuestions: rawSubmission.recommendedQuestions
        ? (rawSubmission.recommendedQuestions as unknown as RecommendedQuestion[])
        : undefined,
    };

    const totalTestCases = submission.totalTestCases;
    const passedTestCases = submission.passedTestCases;
    const passRate =
      totalTestCases > 0 ? (passedTestCases / totalTestCases) * 100 : 0;

    return (
      <div className="container mx-auto max-w-5xl p-6">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 rounded-full"
          >
            <Link href={`/classes/${classCode}/${assignmentId}/submissions`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back to submissions</span>
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl font-medium text-foreground">
              Submission Details
            </h1>
            <p className="text-muted-foreground">{submission.questionTitle}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle>Submitted Code</CardTitle>
                <CardDescription>
                  Submitted on{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4">
                  <pre className="overflow-x-auto text-sm text-muted-foreground">
                    <code>{submission.code}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 rounded-2xl border-border">
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {passedTestCases} of {totalTestCases} test cases passed (
                  {Math.round(passRate)}%)
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  仅展示可见样例详情，隐藏样例不在此列表中。
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submission.testCaseResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full",
                              result.status === "PASSED" &&
                                "bg-status-passed text-status-passed-foreground",
                              result.status === "FAILED" &&
                                "bg-destructive/10 text-destructive",
                              (result.status === "ERROR" ||
                                result.status === "TIMEOUT") &&
                                "bg-destructive/10 text-destructive",
                              result.status === "PENDING" &&
                                "bg-status-pending text-status-pending-foreground",
                            )}
                          >
                            {result.status === "PASSED" && (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            {result.status === "FAILED" && (
                              <XCircle className="h-4 w-4" />
                            )}
                            {(result.status === "ERROR" ||
                              result.status === "TIMEOUT") && (
                              <XCircle className="h-4 w-4" />
                            )}
                            {result.status === "PENDING" && (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <p className="font-medium text-foreground">
                            Test Case {index + 1}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            result.status === "PASSED" &&
                              "bg-status-passed text-status-passed-foreground",
                            result.status === "FAILED" &&
                              "bg-destructive hover:bg-destructive/90",
                            (result.status === "ERROR" ||
                              result.status === "TIMEOUT") &&
                              "bg-destructive hover:bg-destructive/90",
                            result.status === "PENDING" &&
                              "bg-status-pending text-status-pending-foreground",
                          )}
                        >
                          {result.status}
                        </Badge>
                      </div>

                      {result.executionTime && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          Execution Time: {result.executionTime}ms
                        </p>
                      )}

                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Input:</p>
                          <pre className="mt-1 rounded bg-muted p-2 text-xs">
                            {result.testCase.input}
                          </pre>
                        </div>

                        <div>
                          <p className="text-muted-foreground">
                            Expected Output:
                          </p>
                          <pre className="mt-1 rounded bg-muted p-2 text-xs">
                            {result.testCase.expectedOutput}
                          </pre>
                        </div>

                        {result.actualOutput && (
                          <div>
                            <p className="text-muted-foreground">
                              Your Output:
                            </p>
                            <pre className="mt-1 rounded bg-muted p-2 text-xs">
                              {result.actualOutput}
                            </pre>
                          </div>
                        )}

                        {result.errorMessage && (
                          <div>
                            <p className="text-destructive">Error:</p>
                            <pre className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                              {result.errorMessage}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 使用客户端交互组件 */}
            <EvaluationPanel submission={submission} />

            {/* 推荐题目（保持服务端渲染） */}
            {(submission as any).recommendedQuestions && (
              <Card className="mt-6 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                    推荐练习
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(submission as any).recommendedQuestions.map(
                      (q: any, i: number) => (
                        <Link
                          key={i}
                          href={`/classes/${classCode}/${q.assignmentId}`}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <p className="font-medium text-sm">{q.title}</p>
                          <p className="text-xs text-muted-foreground">
                            难度：{q.difficulty}
                          </p>
                        </Link>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧边栏：Submission Info（完整保留你的逻辑） */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle>Submission Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 状态展示（补全你省略的原始逻辑） */}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        submission.status === "COMPLETED" &&
                          "bg-status-passed text-status-passed-foreground",
                        submission.status === "FAILED" &&
                          "bg-destructive/10 text-destructive",
                        submission.status === "PARTIAL" &&
                          "bg-status-partial text-status-partial-foreground",
                        submission.status === "IN_PROGRESS" &&
                          "bg-status-pending text-status-pending-foreground",
                      )}
                    >
                      {submission.status === "COMPLETED" && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {submission.status === "FAILED" && (
                        <XCircle className="h-4 w-4" />
                      )}
                      {submission.status === "PARTIAL" && (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {submission.status === "IN_PROGRESS" && (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <span className="font-medium text-foreground">
                      {submission.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* 提交时间 */}
                <div>
                  <p className="text-sm text-muted-foreground">Submitted At</p>
                  <p className="font-medium text-foreground">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>

                {/* 编程语言 */}
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <div className="mt-1 flex items-center gap-2">
                    <LanguageIcon
                      size={16}
                      language={submission.language as Language}
                    />
                    <span className="font-medium">{submission.language}</span>
                  </div>
                </div>

                {/* 分数 */}
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{submission.score}%</p>
                  <Progress
                    value={submission.score || 0}
                    className="h-2 mt-2"
                  />
                </div>

                {/* 测试用例通过率 */}
                <div>
                  <p className="text-sm text-muted-foreground">Test Cases</p>
                  <div className="mt-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        {passedTestCases}/{totalTestCases} Passed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(passRate)}%
                      </p>
                    </div>
                    <Progress value={passRate} className="mt-1 h-2" />
                  </div>
                </div>

                {/* 神经符号标记 */}
                {(submission as any).aiFeedback && (
                  <div className="pt-3 border-t">
                    {(submission as any).aiFeedback.noCustomMetrics ? (
                      <>
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-bold">
                            AI Analysis Skipped
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          本题未配置自定义指标，已跳过深度分析。
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                          <BrainCircuit className="h-4 w-4" />
                          <span className="text-xs font-bold">
                            AI Analysis Completed
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          代码已通过神经符号引擎完成深度因果评估
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* 情绪陪伴语 */}
                {(submission as any).emotion && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-pink-600 mb-1">
                      <Heart className="h-4 w-4 fill-current" />
                      <span className="text-xs font-bold">
                        Learning Companion
                      </span>
                    </div>
                    <p className="text-xs italic leading-relaxed text-pink-900 p-2 bg-pink-50/20 rounded-lg">
                      "
                      {(submission as any).emotion.emotion_analysis
                        ?.supportive_guidance || "继续加油！"}
                      "
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Submission detail error:", error);
    return (
      <div className="container mx-auto max-w-5xl p-6 text-center">
        <h1 className="text-2xl font-medium text-foreground mb-4">加载失败</h1>
        <p className="text-muted-foreground mb-6">
          无法获取提交详情，请稍后重试
        </p>
        <Button asChild>
          <Link href={`/classes/${classCode}/${assignmentId}/submissions`}>
            返回提交列表
          </Link>
        </Button>
      </div>
    );
  }
}
