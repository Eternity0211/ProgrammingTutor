"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Maximize2, Minimize2, FileText } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { QuestionDescription } from "./question-description";
import { CodeEditor } from "./code-editor";
import { QuestionNav } from "./question-nav";
import { AssignmentById } from "@/lib/types/assignment-tyes";
import { FullscreenAlert } from "./fullscreen-alert";
import { CombinedTesting } from "./combined-testing-component";
import { useFullScreen } from "@/hooks/use-fullscreen";
import { useCodeRunner } from "@/hooks/use-code-runner";

import { AIFeedbackPanel } from "./ai-feedback-panel";

interface AssignmentLayoutProps {
  assignment: AssignmentById;
  classCode: string;
}

export function AssignmentLayout({
  assignment,
  classCode,
}: AssignmentLayoutProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const { isFullscreen } = useFullScreen();
  const currentQuestion = assignment.questions[currentQuestionIndex];
  const {
    isRunning,
    codeStatus,
    testResults,
    aiAnalysis,
    navigation,
    emotion,
    runCode,
    submitCode,
  } = useCodeRunner({
    code,
    language: currentQuestion.language,
    questionId: currentQuestion.id,
    input: customInput,
  });

  const showFullscreenAlert = assignment.fullScreenEnforcement && !isFullscreen;

  return (
    <>
      {showFullscreenAlert && <FullscreenAlert />}
      <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
        {/* Left Panel */}
        <motion.div
          initial={false}
          animate={{
            width: isDescriptionExpanded ? "100%" : "40%",
          }}
          transition={{ duration: 0.2 }}
          className="relative flex h-full flex-col border-r border-border"
        >
          <div className="flex items-center justify-between overflow-x-auto border-b border-border px-4 py-2">
            <QuestionNav
              questions={assignment.questions}
              currentIndex={currentQuestionIndex}
              onSelect={setCurrentQuestionIndex}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border"
                onClick={() =>
                  (window.location.href = `/classes/${classCode}/${assignment.id}/submissions`)
                }
              >
                <FileText className="h-4 w-4" />
                <span>Submissions</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="h-8 w-8 rounded-full"
              >
                {isDescriptionExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <QuestionDescription question={currentQuestion} />
          </div>

          <AnimatePresence>
            {!isDescriptionExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -right-6 top-1/2 z-10"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDescriptionExpanded(true)}
                  className="h-12 w-12 rounded-full bg-background shadow-md hover:shadow-xl hover:bg-muted transition"
                >
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Panel */}
        <AnimatePresence>
          {!isDescriptionExpanded && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "60%" }}
              exit={{ width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-col bg-background"
            >
              <CodeEditor
                code={code}
                onChange={setCode}
                language={currentQuestion.language}
                onRun={runCode}
                onSubmit={submitCode}
                isRunning={isRunning}
                disableCopyPaste={assignment.copyPastePrevention}
              />

              <div className="border-t border-border grid grid-cols-2 h-80 overflow-hidden bg-background">
                <div className="border-r border-border overflow-y-auto">
                  <CombinedTesting
                    results={testResults}
                    customInput={customInput}
                    onCustomInputChange={setCustomInput}
                    onRunCode={runCode}
                    isRunning={isRunning}
                    codeStatus={codeStatus}
                  />
                </div>

                <div className="overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/10">
                  <AIFeedbackPanel
                    aiAnalysis={aiAnalysis}
                    navigation={navigation}
                    emotion={emotion}
                    isRunning={isRunning}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
