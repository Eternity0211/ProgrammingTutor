import { CodeRunner, SymbolicResult, AIFeedback } from "@/lib/types/code-types";
import { useState } from "react";
import { toast } from "sonner";

import { LearningNavigationResult } from "@/server/model/neural/navigationAgent";
import { EmotionAnalysisResult } from "@/server/model/neural/emotionAgent";

interface useCodeRunnerParams {
  code: string;
  language: string;
  questionId: string;
  input?: string;
}

export type QuestionSubmitState = "idle" | "tests-passed" | "full";

interface SubmissionSummary {
  questionId: string;
  score: number;
  testCaseScore: number;
}

export function useCodeRunner({
  code,
  language,
  questionId,
  input,
}: useCodeRunnerParams) {
  const [isRunning, setIsRunning] = useState(false);
  const [codeStatus, setCodeStatus] = useState<string>("");
  const [testResults, setTestResults] = useState<CodeRunner[]>([]);

  const [aiAnalysis, setAiAnalysis] = useState<AIFeedback | null>(null);
  const [navigation, setNavigation] = useState<LearningNavigationResult | null>(
    null,
  );
  const [emotion, setEmotion] = useState<EmotionAnalysisResult | null>(null);
  const [lastSubmissionSummary, setLastSubmissionSummary] =
    useState<SubmissionSummary | null>(null);

  const runCode = async () => {
    if (isRunning) {
      toast.warning("Code already in process of execution");
      return;
    }
    if (code.trim() === "") {
      toast.error("Please enter some code to run");
      return;
    }
    setIsRunning(true);
    setCodeStatus("Running visible test cases...");

    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          questionId,
          customInput: input,
          language: language,
        }),
      });
      const data = await response.json();

      const mappedResults = Array.isArray(data?.results)
        ? data.results.map((result: CodeRunner & Record<string, unknown>) => ({
            input: result.input as string,
            status: result.status as string,
            runtime: result.runtime as string,
            memory: result.memory as string,
            output: result.output as string,
            error: result.error as string,
            hidden: Boolean(result.hidden),
            expectedOutput: (result.expectedOutput as string | null) ?? null,
            caseLabel: (result.caseLabel as string) || "Test Case",
            isCustom: Boolean(result.isCustom),
          }))
        : [];

      if (!response.ok) {
        setTestResults(mappedResults);
        throw new Error(data?.error || "Failed to run code");
      }

      setTestResults(mappedResults);

      if (data?.symbolicFailed) {
        setCodeStatus(
          "Symbolic check failed. Please fix syntax/critical issues.",
        );
        return;
      }

      setCodeStatus("Run complete.");
    } catch (error: any) {
      console.error("Error running code:", error);
      setCodeStatus(`Run failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (isRunning) {
      toast.warning("Submission already in progress");
      return;
    }
    if (code.trim() === "") {
      toast.error("Please enter some code to submit");
      return;
    }
    setIsRunning(true);
    setTestResults([]);
    toast.success("Submitting your solution...");
    setCodeStatus("Submitting your solution...");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          questionId,
          language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit solution");
      }

      const data = await response.json();
      const submissionId = data.submissionId;

      setCodeStatus("Running test cases...");
      toast.success("Running test cases...");
      await pollSubmissionStatus(submissionId);
    } catch (error: any) {
      console.error("Submission error:", error);
      setCodeStatus(`Submission failed: ${error.message}`);
      toast.error(
        error.message || "An error occurred while submitting your solution",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const pollSubmissionStatus = async (submissionId: string) => {
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // Poll for maximum of 30 attempts (30 seconds with 2s interval) that is for 60 seconds

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const response = await fetch(`/api/submissions/${submissionId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch submission status");
        }

        const submissionData = await response.json();

        const mappedResults = submissionData.results.map(
          (result: CodeRunner & Record<string, unknown>) => ({
            input: result.input,
            status: result.status,
            runtime: result.runtime,
            memory: result.memory,
            output: result.output,
            error: result.error,
            hidden: Boolean(result.hidden),
            expectedOutput: (result.expectedOutput as string | null) ?? null,
            caseLabel: (result.caseLabel as string) || "Test Case",
            isCustom: Boolean(result.isCustom),
          }),
        );

        setTestResults(mappedResults);

        if (
          submissionData.status === "EVALUATION_COMPLETE" ||
          submissionData.status === "TEST_CASES_EVALUATION_FAILED" ||
          submissionData.status === "LLM_EVALUATION_FAILED"
        ) {
          completed = true;

          // Check if all tests passed by examining test results
          const hasFailedTests = mappedResults.some(
            (result: any) => result.status !== "passed",
          );
          const allTestsPassed =
            submissionData.status === "EVALUATION_COMPLETE" && !hasFailedTests;

          setAiAnalysis(submissionData.aiFeedback);
          setNavigation(submissionData.navigation);
          setEmotion(submissionData.emotion);
          setLastSubmissionSummary({
            questionId: submissionData.questionId,
            score: Number(submissionData.score || 0),
            testCaseScore: Number(submissionData.testCaseScore || 0),
          });

          if (allTestsPassed) {
            setCodeStatus("All tests passed successfully!");
            toast.success("Your solution passed all test cases");
          } else {
            setCodeStatus("Some tests failed. Check the results for details.");
            toast.error("Your solution didn't pass all test cases");
          }

          break;
        }

        setCodeStatus(`Running test cases (${attempts}/${maxAttempts})...`);
      } catch (error) {
        console.error("Error polling submission status:", error);
      }
    }

    if (!completed) {
      setCodeStatus(
        "Submission is taking longer than expected. You can check results later.",
      );
    }

    return completed;
  };

  return {
    isRunning,
    codeStatus,
    testResults,
    aiAnalysis,
    navigation,
    emotion,
    lastSubmissionSummary,
    runCode,
    submitCode,
  };
}
