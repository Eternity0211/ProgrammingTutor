"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Beaker } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Card, CardContent } from "@/app/_components/ui/card";
import { TestCase } from "@/lib/types/assignment-tyes";
import TestCaseGenarationDialog from "../../testcase/Test-Case-Gen-dialog";

interface TestCasesListProps {
  testCases: TestCase[];
  onTestCasesChange: (testCases: TestCase[]) => void;
  questionTitle: string;
  questionDescription: string;
  questionLanguage: string;
  questionId: string;
}

export function TestCasesList({
  testCases,
  onTestCasesChange,
  questionTitle,
  questionDescription,
  questionLanguage,
  questionId,
}: TestCasesListProps) {
  const testCaseRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastAddedTestCaseId = useRef<string | null>(null);

  useEffect(() => {
    if (lastAddedTestCaseId.current) {
      requestAnimationFrame(() => {
        const testCaseElement =
          testCaseRefs.current[lastAddedTestCaseId.current!];
        if (testCaseElement) {
          testCaseElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          lastAddedTestCaseId.current = null;
        }
      });
    }
  }, [testCases]);

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: `${testCases.length + 1}`,
      input: "",
      expectedOutput: "",
      hidden: false,
    };
    lastAddedTestCaseId.current = newTestCase.id;
    onTestCasesChange([...testCases, newTestCase]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      onTestCasesChange(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const newTestCases = [...testCases];
    newTestCases[index] = {
      ...newTestCases[index],
      [field]: value,
    };
    onTestCasesChange(newTestCases);
  };

  const updateField = (field: keyof any, value: any) => {
    if (field === "testCases") {
      onTestCasesChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-medium text-foreground">
          <Beaker className="h-4 w-4 text-muted-foreground" />
          Test Cases
        </h3>
        <div className="flex gap-2">
          <TestCaseGenarationDialog
            title={questionTitle}
            description={questionDescription}
            language={questionLanguage}
            updateField={updateField}
            existingTestCases={testCases}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTestCase}
            className="gap-1 border-border"
          >
            <Plus className="h-4 w-4" />
            Add Test Case
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {testCases.map((testCase, index) => (
          <motion.div
            key={testCase.id}
            ref={(el) => {
              testCaseRefs.current[testCase.id] = el;
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="rounded-xl border border-border bg-background">
              <CardContent className="p-4">
                <div className="flex items-center justify-between pb-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Test Case {index + 1}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`test-case-${questionId}-${testCase.id}-hidden`}
                        checked={testCase.hidden}
                        onCheckedChange={(checked) =>
                          updateTestCase(index, "hidden", checked === true)
                        }
                      />
                      <Label
                        htmlFor={`test-case-${questionId}-${testCase.id}-hidden`}
                        className="text-xs text-foreground"
                      >
                        Hidden from students
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestCase(index)}
                      className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove test case</span>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label
                      htmlFor={`test-case-${questionId}-${testCase.id}-input`}
                      className="text-xs text-foreground"
                    >
                      Input
                    </Label>
                    <Textarea
                      id={`test-case-${questionId}-${testCase.id}-input`}
                      value={testCase.input}
                      onChange={(e) =>
                        updateTestCase(index, "input", e.target.value)
                      }
                      placeholder="Input for this test case..."
                      className="h-24 resize-none bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor={`test-case-${questionId}-${testCase.id}-output`}
                      className="text-xs text-foreground"
                    >
                      Expected Output
                    </Label>
                    <Textarea
                      id={`test-case-${questionId}-${testCase.id}-output`}
                      value={testCase.expectedOutput}
                      onChange={(e) =>
                        updateTestCase(index, "expectedOutput", e.target.value)
                      }
                      placeholder="Expected output for this test case..."
                      className="h-24 resize-none bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
