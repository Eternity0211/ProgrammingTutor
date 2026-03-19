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
    setCodeStatus("Running");
    toast.success("Running your code...");

    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          input: input,
          language: language,
        }),
      });
      const data = await response.json();
      const output = data?.output;

      if (!response.ok || output?.status === "failed") {
        throw new Error(output?.error || "Failed to run code");
      }

      setTestResults([output]);
      toast.success("Your code ran successfully");
    } catch (error: any) {
      console.error("Error running code:", error);
      setCodeStatus(`Error running code: ${error.message}`);
      toast.error(
        error.message || "An error occurred while submitting your solution",
      );
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
          (result: CodeRunner) => ({
            input: result.input,
            status: result.status,
            runtime: result.runtime,
            memory: result.memory,
            output: result.output,
            error: result.error,
            hidden: result.hidden,
          }),
        );

        setTestResults(mappedResults);

        if (
          submissionData.status === "EVALUATION_COMPLETE" ||
          submissionData.status === "TEST_CASES_EVALUATION_FAILED" ||
          submissionData.status === "LLM_EVALUATION_FAILED"
        ) {
          completed = true;

          if (submissionData.status === "EVALUATION_COMPLETE") {
            setAiAnalysis(submissionData.aiFeedback);
            setNavigation(submissionData.navigation);
            setEmotion(submissionData.emotion);

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
    runCode,
    submitCode,
  };
}
