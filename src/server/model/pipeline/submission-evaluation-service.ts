import { CodeEvaluationStatus, Prisma, TestCaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LANGUAGE_ID_MAP } from "@/config/constants";
import { EXTERNAL_JUDGE0_API } from "@/config/route";
import { analyzeCode } from "@/server/model/symbolic/service";
import { evaluateCodeWithLLM } from "@/lib/services/code-evaluation-llm-service";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { updateSubmissionStatus } from "@/server/actions/submission-actions";

type Judge0Execution = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status?: { id: number; description: string };
  time?: string | null;
};

function encodeBase64(value: string) {
  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64(value: string | null | undefined) {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch (e) {
    return value || "";
  }
}

async function executeWithJudge0(params: {
  code: string;
  input: string;
  expectedOutput?: string;
  languageId: number;
}): Promise<Judge0Execution> {
  const payload: Record<string, unknown> = {
    source_code: encodeBase64(params.code),
    stdin: encodeBase64(params.input || ""),
    language_id: params.languageId,
    expected_output: encodeBase64(params.expectedOutput || ""),
  };
  const judge0Url = `${EXTERNAL_JUDGE0_API}/submissions?base64_encoded=true&wait=true`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.JUDGE0_API_KEY?.trim();
  const apiHost = process.env.JUDGE0_API_HOST?.trim();
  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }
  const response = await fetch(judge0Url, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 request failed (${response.status}): ${text}`);
  }
  return (await response.json()) as Judge0Execution;
}

function hasSymbolicBlockingIssues(symbolicErrors: { severity: string }[]): boolean {
  return symbolicErrors.some(issue => issue.severity === "Critical" || issue.severity === "High");
}

export async function evaluateSubmissionInsidePlatform(codeSubmissionId: string) {
  const codeSubmission = await prisma.codeSubmission.findUnique({
    where: { id: codeSubmissionId },
    include: {
      question: { include: { testCases: true } },
      submission: {
        include: {
          assignment: { include: { metrics: { include: { metric: true } } } },
        },
      },
    },
  });

  if (!codeSubmission) throw new Error(`Code submission ${codeSubmissionId} not found`);

  // 1. 符号执行与静态分析
  const symbolic = await analyzeCode(codeSubmission.code);
  const blocking = hasSymbolicBlockingIssues(symbolic.errors);
  
  let testCaseScore = 0;
  let passedCount = 0;
  const totalCount = codeSubmission.question.testCases.length;

  if (!blocking) {
    const mappedLanguageId = LANGUAGE_ID_MAP[codeSubmission.language as keyof typeof LANGUAGE_ID_MAP];
    const cppLanguageOverride = Number(process.env.JUDGE0_CPP_LANGUAGE_ID);
    const languageId = (codeSubmission.language === "C++" && Number.isFinite(cppLanguageOverride) && cppLanguageOverride > 0)
      ? cppLanguageOverride : mappedLanguageId;

    if (languageId) {
      // ✅ 修改点：使用结果数组统一计数，解决判定不准问题
      const results = await Promise.all(codeSubmission.question.testCases.map(async (testCase) => {
        try {
          const execution = await executeWithJudge0({ 
            code: codeSubmission.code, 
            input: testCase.input, 
            expectedOutput: testCase.expectedOutput, 
            languageId 
          });
          
          const statusId = execution.status?.id;
          const status = statusId === 3 ? TestCaseStatus.PASSED : (statusId === 4 ? TestCaseStatus.FAILED : TestCaseStatus.ERROR);
          
          // 更新测试用例明细记录
          await prisma.testCaseResult.update({
            where: { codeSubmissionId_testCaseId: { codeSubmissionId, testCaseId: testCase.id } },
            data: { 
              status, 
              actualOutput: decodeBase64(execution.stdout),
              errorMessage: decodeBase64(execution.compile_output) || decodeBase64(execution.stderr) || execution.message,
              executionTime: execution.time ? Math.round(parseFloat(execution.time) * 1000) : null,
            },
          });

          return status === TestCaseStatus.PASSED ? 1 : 0;
        } catch (error) { 
          console.error("Judge0 执行异常", error); 
          return 0;
        }
      }));

      passedCount = results.reduce<number>((acc, curr) => acc + curr, 0);
      testCaseScore = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    }
  }

  const isAllTestsPassed = !blocking && totalCount > 0 && passedCount === totalCount;
  let metricScore = 0, score = 0, aiFeedback: any = null, navigation: any = null, emotion: any = null;
  let knowledgeContext = {};

  // ✅ 统一的 Neo4j 容错处理逻辑
  try {
    const concepts = [...symbolic.errors, ...symbolic.warnings].map(i => i.knowledge_concept).filter(Boolean);
    if (concepts.length > 0) knowledgeContext = await getAggregatedKnowledgeContext(concepts);
  } catch (e) {
    console.warn("Neo4j 服务不可用，跳过图谱关联分析");
  }

  if (!blocking) {
    // 2. 正常分支：调用 LLM 进行指标评估
    const assignmentMetrics = codeSubmission.submission.assignment.metrics;
    let evaluations: any[] = [];
    
    if (assignmentMetrics.length > 0) {
      const llmResult = await evaluateCodeWithLLM({ 
        code: codeSubmission.code, 
        language: codeSubmission.language, 
        questionTitle: codeSubmission.question.title, 
        questionDescription: codeSubmission.question.description, 
        metrics: assignmentMetrics 
      });
      evaluations = llmResult.evaluations;
      metricScore = evaluations.reduce((acc, m) => {
        const weight = assignmentMetrics.find(am => am.metricId === m.metricId)?.weight || 0;
        return acc + (m.score * weight) / 100;
      }, 0);
      score = isAllTestsPassed ? 100 : (testCaseScore * 0.6 + metricScore * 0.4);
    } else { 
      score = testCaseScore; 
    }

    aiFeedback = { 
      branch: "general-llm", 
      causalAnalysis: isAllTestsPassed ? "逻辑验证通过。" : "部分测试用例未通过，需检查边界条件。", 
      suggestions: evaluations.map(e => `${e.metricName}: ${e.feedback}`) 
    };

    navigation = await generateLearningNavigation({ 
      codeReviewResult: JSON.stringify(aiFeedback), 
      knowledgeGraph: JSON.stringify(knowledgeContext), 
      studentHistory: "" 
    });
  } else {
    // 3. 阻塞分支：调用 Code Review Agent
    const codeReviewResult = await runCodeReviewAgent({ 
      code: codeSubmission.code, 
      language: codeSubmission.language, 
      symbolic, 
      testSummary: { total: totalCount, passed: 0, failed: totalCount } 
    });
    
    aiFeedback = { branch: "code-review-agent", ...codeReviewResult };
    navigation = await generateLearningNavigation({ 
      codeReviewResult: codeReviewResult.causalAnalysis, 
      knowledgeGraph: JSON.stringify(knowledgeContext), 
      studentHistory: "" 
    });
    score = 0;
  }

  // 4. 生成情感支持
  emotion = await generateEmotionalSupport({ 
    codeReviewResult: isAllTestsPassed ? "表现优异" : "再接再厉" 
  });

  // 5. 更新最终状态到数据库
  await prisma.codeSubmission.update({
    where: { id: codeSubmissionId },
    data: { 
      metricScore, 
      score, 
      testCaseScore, 
      feedback: JSON.stringify({ symbolic, aiFeedback, navigation, emotion }), 
      codeEvaluationStatus: CodeEvaluationStatus.EVALUATION_COMPLETE 
    },
  });

  // 更新总提交表状态
  await updateSubmissionStatus(codeSubmission.submissionId);

  return { success: true, score };
}