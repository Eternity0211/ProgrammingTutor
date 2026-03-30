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
import { useRouter } from "next/navigation";
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
  const recommendedExercises =
    navigation?.learning_navigation?.recommended_exercises || [];

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

              <div className="border-t border-border grid grid-cols-2 h-[900px] overflow-hidden bg-background">
                <div className="border-r border-border overflow-y-auto p-2">
                  <h2 className="text-lg font-semibold mb-2">
                    测试结果 / 符号规则报错
                  </h2>
                  <CombinedTesting
                    results={testResults}
                    customInput={customInput}
                    onCustomInputChange={setCustomInput}
                    onRunCode={runCode}
                    isRunning={isRunning}
                    codeStatus={codeStatus}
                  />
                </div>

                <div className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold">针对性练习推荐</h2>

                  {recommendedExercises.length > 0 ? (
                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border">
                      <p className="text-sm">
                        根据本次提交的错误，系统为你推荐以下练习：
                      </p>
                      <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                        {recommendedExercises.map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border text-center text-gray-400 py-4">
                      暂无推荐练习
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            window.location.href = `/classes/${classCode}/${assignment.id}/submissions`;
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg"
        >
          查看提交记录
        </Button>
      </div>
    </>
  );
}

// export function AssignmentLayout({
//   assignment,
//   classCode,
// }: AssignmentLayoutProps) {
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
//   const [code, setCode] = useState("// 在此编写代码...");
//   const [customInput, setCustomInput] = useState("");
//   const { isFullscreen } = useFullScreen();
//   const router = useRouter();
//   const currentQuestion = assignment.questions[currentQuestionIndex];
//   const {
//     isRunning,
//     codeStatus,
//     testResults,
//     aiAnalysis,
//     navigation,
//     emotion,
//     runCode,
//     submitCode,
//   } = useCodeRunner({
//     code,
//     language: currentQuestion.language,
//     questionId: currentQuestion.id,
//     input: customInput,
//   });

//   const showFullscreenAlert = assignment.fullScreenEnforcement && !isFullscreen;
//   const exercises = navigation?.learning_navigation?.recommended_exercises || [];

//   const goToSubmissionDetail = () => {
//     router.push(`/classes/${classCode}/${assignment.id}/submissions}`);
//   };

//   return (
//     <>
//       {showFullscreenAlert && <FullscreenAlert />}
//       <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
//         {/* Left Panel */}
//         <motion.div
//           initial={false}
//           animate={{
//             width: isDescriptionExpanded ? "100%" : "40%",
//           }}
//           transition={{ duration: 0.2 }}
//           className="relative flex h-full flex-col border-r border-border"
//         >
//           <div className="flex items-center justify-between overflow-x-auto border-b border-border px-4 py-2">
//             <QuestionNav
//               questions={assignment.questions}
//               currentIndex={currentQuestionIndex}
//               onSelect={setCurrentQuestionIndex}
//             />
//             <div className="flex items-center gap-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 className="gap-1.5 border-border"
//                 onClick={() =>
//                   router.push(`/classes/${classCode}/${assignment.id}/submissions`)
//                 }
//               >
//                 <FileText className="h-4 w-4" />
//                 <span>Submissions</span>
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
//                 className="h-8 w-8 rounded-full"
//               >
//                 {isDescriptionExpanded ? (
//                   <Minimize2 className="h-4 w-4" />
//                 ) : (
//                   <Maximize2 className="h-4 w-4" />
//                 )}
//               </Button>
//             </div>
//           </div>

//           <div className="flex-1 overflow-y-auto p-6">
//             <QuestionDescription question={currentQuestion} />
//           </div>

//           <AnimatePresence>
//             {!isDescriptionExpanded && (
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="absolute -right-6 top-1/2 z-10"
//               >
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   onClick={() => setIsDescriptionExpanded(true)}
//                   className="h-12 w-12 rounded-full bg-background shadow-md hover:shadow-xl hover:bg-muted transition"
//                 >
//                   <ChevronRight className="h-4 w-4 text-foreground" />
//                 </Button>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </motion.div>

//         {/* Right Panel */}
//         <AnimatePresence>
//           {!isDescriptionExpanded && (
//             <motion.div
//               initial={{ width: 0 }}
//               animate={{ width: "60%" }}
//               exit={{ width: 0 }}
//               transition={{ duration: 0.2 }}
//               className="flex h-full flex-col bg-background"
//             >
//               <div className="p-4 border-b border-border flex flex-col gap-2">
//                 <h3 className="text-sm font-medium">代码编辑器</h3>
//                 <textarea
//                   value={code}
//                   onChange={(e) => setCode(e.target.value)}
//                   className="w-full h-[300px] p-3 font-mono text-sm border rounded-md bg-white dark:bg-zinc-900"
//                   placeholder="在这里输入 C++ 代码..."
//                 />

//                 <div className="flex gap-2 mt-2">
//                   <Button
//                     onClick={runCode}
//                     disabled={isRunning}
//                     className="w-full"
//                   >
//                     {isRunning ? "运行中..." : "运行代码"}
//                   </Button>
//                   <Button
//                     onClick={submitCode}
//                     disabled={isRunning}
//                     className="w-full"
//                     variant="default"
//                   >
//                     提交
//                   </Button>
//                 </div>
//               </div>

//               <div className="border-t border-border grid grid-cols-2 h-96 overflow-hidden bg-background">
//                 <div className="border-r border-border overflow-y-auto">
//                   <CombinedTesting
//                     results={testResults}
//                     customInput={customInput}
//                     onCustomInputChange={setCustomInput}
//                     onRunCode={runCode}
//                     isRunning={isRunning}
//                     codeStatus={codeStatus}
//                   />
//                 </div>

//                 <div className="flex flex-col h-full overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/10 p-4">

//                   {/* 上半部分：AI 动态推荐练习 */}
//                   <div className="flex-1">
//                     <h3 className="text-lg font-semibold mb-4">针对性练习推荐</h3>

//                     {exercises.length > 0 ? (
//                       <div className="space-y-3">
//                         {exercises.map((item) => (
//                           <div
//                             key={item.id}
//                             className="p-3 border rounded-lg bg-white dark:bg-zinc-900"
//                           >
//                             <div className="flex justify-between items-center">
//                               <span className="font-medium">{item.title}</span>
//                               <span className={`text-xs px-2 py-0.5 rounded-full ${
//                                 item.difficulty === "入门" ? "bg-green-100 text-green-700" :
//                                 item.difficulty === "初级" ? "bg-blue-100 text-blue-700" :
//                                 item.difficulty === "中级" ? "bg-yellow-100 text-yellow-700" :
//                                 "bg-red-100 text-red-700"
//                               }`}>
//                                 {item.difficulty}
//                               </span>
//                             </div>
//                             <p className="text-sm text-muted-foreground mt-1">
//                               {item.purpose}
//                             </p>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <div className="py-8 text-center text-gray-400">
//                         暂无推荐练习
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//       <div className="fixed bottom-6 right-6 z-50">
//         <Button
//           onClick={goToSubmissionDetail}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg"
//         >
//           查看提交记录
//         </Button>
//       </div>
//     </>
//   );
// }
