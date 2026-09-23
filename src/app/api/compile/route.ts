import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkProductionConfig } from "@/server/config";
import { prisma } from "@/lib/prisma";
import { LANGUAGE_ID_MAP } from "@/config/constants";
import { EXTERNAL_JUDGE0_API } from "@/config/route";
import { analyzeCode } from "@/server/model/symbolic/service";
import {
  normalizeJudge0Result,
  type Judge0ExecutionLike,
} from "@/server/model/pipeline/runtime-result";

type Judge0Execution = Judge0ExecutionLike;

type RunCaseResult = {
  caseLabel: string;
  isCustom: boolean;
  input: string;
  expectedOutput?: string | null;
  output: string;
  error: string;
  status: "passed" | "failed" | "executed";
  runtime: string;
  memory: string;
  hidden: boolean;
};

function hasSymbolicBlockingIssues(symbolicErrors: { severity: string }[]) {
  return symbolicErrors.some(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );
}

function buildBlockingErrorSummary(
  symbolicErrors: { ruleId: string; message: string }[],
) {
  return symbolicErrors
    .slice(0, 3)
    .map((e) => `${e.ruleId}: ${e.message}`)
    .join(" | ");
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf-8").toString("base64");
}

async function executeWithJudge0(params: {
  code: string;
  input: string;
  languageId: number;
  expectedOutput?: string;
}): Promise<Judge0Execution> {
  const payload: Record<string, unknown> = {
    source_code: encodeBase64(params.code),
    stdin: encodeBase64(params.input || ""),
    language_id: params.languageId,
  };

  if (typeof params.expectedOutput === "string") {
    payload.expected_output = encodeBase64(params.expectedOutput);
  }

  const judge0Url = `${EXTERNAL_JUDGE0_API}/submissions?base64_encoded=true&wait=true`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.JUDGE0_API_KEY?.trim();
  const apiHost = process.env.JUDGE0_API_HOST?.trim();

  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }

  const response = await fetch(judge0Url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as Judge0Execution;
}

function toRunResult(params: {
  execution: Judge0Execution;
  caseLabel: string;
  isCustom: boolean;
  input: string;
  expectedOutput?: string;
}): RunCaseResult {
  const execution = params.execution;
  const normalized = normalizeJudge0Result(execution);
  const runtime = normalized.runtimeMs === null ? "N/A" : `${normalized.runtimeMs}ms`;
  const memory = normalized.memoryKb === null ? "N/A" : `${normalized.memoryKb} KB`;

  if (normalized.status === "error" || normalized.error) {
    return {
      caseLabel: params.caseLabel,
      isCustom: params.isCustom,
      input: params.input,
      expectedOutput: params.isCustom ? null : params.expectedOutput || null,
      output: normalized.output,
      error: normalized.error,
      status: "failed",
      runtime,
      memory,
      hidden: false,
    };
  }

  if (params.isCustom) {
    return {
      caseLabel: params.caseLabel,
      isCustom: true,
      input: params.input,
      expectedOutput: null,
       output: normalized.output,
      error: "",
      status: "executed",
      runtime,
      memory,
      hidden: false,
    };
  }

  return {
    caseLabel: params.caseLabel,
    isCustom: false,
    input: params.input,
    expectedOutput: params.expectedOutput || "",
    output: normalized.output,
    error: normalized.error,
    status: normalized.status === "passed" ? "passed" : "failed",
    runtime,
    memory,
    hidden: false,
  };
}

export async function POST(req: NextRequest) {
  const configIssues = checkProductionConfig();
  if (configIssues.length > 0) {
    return NextResponse.json(
      { error: "Server configuration incomplete", issues: configIssues },
      { status: 503 },
    );
  }
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { code, language, questionId, customInput } = await req.json();
    if (!code || !language || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const mappedLanguageId =
      LANGUAGE_ID_MAP[language as keyof typeof LANGUAGE_ID_MAP];
    const cppLanguageOverride = Number(process.env.JUDGE0_CPP_LANGUAGE_ID);
    const languageId =
      language === "C++" &&
      Number.isFinite(cppLanguageOverride) &&
      cppLanguageOverride > 0
        ? cppLanguageOverride
        : mappedLanguageId;
    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 },
      );
    }

    const symbolic = await analyzeCode(code);
    const hasBlocking = hasSymbolicBlockingIssues(symbolic.errors);

    if (hasBlocking) {
      return NextResponse.json({
        status: 200,
        symbolicFailed: true,
        symbolic,
        results: [
          {
            caseLabel: "Symbolic Check",
            isCustom: false,
            input: "",
            expectedOutput: null,
            output: "",
            error: buildBlockingErrorSummary(symbolic.errors),
            status: "failed",
            runtime: `${Math.round(symbolic.metadata?.parseTime || 0)}ms`,
            memory: "N/A",
            hidden: false,
          },
        ],
      });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        testCases: {
          where: { hidden: false },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    const sampleResults = await Promise.all(
      question.testCases.map(async (testCase, index) => {
        const execution = await executeWithJudge0({
          code,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          languageId,
        });

        return toRunResult({
          execution,
          caseLabel: `Test Case ${index + 1}`,
          isCustom: false,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        });
      }),
    );

    let customResult: RunCaseResult[] = [];
    if (typeof customInput === "string" && customInput.trim().length > 0) {
      const customExecution = await executeWithJudge0({
        code,
        input: customInput,
        languageId,
      });

      customResult = [
        toRunResult({
          execution: customExecution,
          caseLabel: "Custom Test",
          isCustom: true,
          input: customInput,
        }),
      ];
    }

    return NextResponse.json({
      status: 200,
      symbolicFailed: false,
      symbolic,
      results: [...customResult, ...sampleResults],
    });
  } catch (e: any) {
    console.error("Error running code:", e);
    return NextResponse.json(
      {
        status: 500,
        symbolicFailed: false,
        results: [
          {
            caseLabel: "Run Error",
            isCustom: false,
            input: "",
            expectedOutput: null,
            runtime: "N/A",
            memory: "N/A",
            status: "failed",
            output: "",
            error: e?.message || "Failed to run code. Please try again.",
            hidden: false,
          },
        ],
      },
      { status: 500 },
    );
  }
}
