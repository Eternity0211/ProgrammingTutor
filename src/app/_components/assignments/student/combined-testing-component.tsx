"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Play,
  FormInputIcon,
  FileCode2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/app/_components/ui/textarea";
import { TestCase } from "@/lib/types/assignment-tyes";
import { Button } from "@/app/_components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/_components/ui/accordion";
import { CodeRunner } from "@/lib/types/code-types";

interface CombinedTestingProps {
  results: CodeRunner[];
  customInput: string;
  onCustomInputChange: (value: string) => void;
  onRunCode: () => void;
  isRunning: boolean;
  codeStatus: string;
}

export function CombinedTesting({
  results,
  customInput,
  onCustomInputChange,
  onRunCode,
  isRunning,
  codeStatus,
}: CombinedTestingProps) {
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  const filteredResults = results.filter((result) => !result.hidden);

  return (
    <div className="h-80 overflow-y-auto border-t border-border bg-background">
      <div className="sticky top-0 border-b border-border bg-background px-4 py-3 flex justify-between items-center">
        <h3 className="text-sm font-medium text-foreground">Test Results</h3>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "bg-muted text-foreground hover:bg-muted/70 border-border",
              isCustomInputOpen && "bg-muted/70",
            )}
            onClick={() => setIsCustomInputOpen(!isCustomInputOpen)}
          >
            <FormInputIcon className="h-4 w-4 mr-1" />
            Custom Input
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-muted text-foreground hover:bg-muted/70 border-border"
            onClick={() => {
              setIsCustomInputOpen(false);
              onRunCode();
            }}
            disabled={isRunning}
          >
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>
      </div>

      {isCustomInputOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-border p-4"
        >
          <div className="flex flex-col space-y-3">
            <div>
              <label
                htmlFor="custom-input"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Custom Input
              </label>
              <Textarea
                id="custom-input"
                value={customInput}
                onChange={(e) => onCustomInputChange(e.target.value)}
                placeholder="Enter your custom test input here..."
                className="h-24 resize-none border-border bg-muted text-foreground placeholder:text-muted-foreground"
                disabled={isRunning}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter input values separated by line breaks or spaces as
                required by your code.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="divide-y divide-border">
        {filteredResults.length > 0 ? (
          filteredResults.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              className="px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    result?.status === "passed" &&
                      "bg-status-passed text-status-passed-foreground",
                    result?.status === "failed" &&
                      "bg-destructive text-destructive-foreground",
                    result?.status === "running" &&
                      "bg-status-pending text-status-pending-foreground",
                    result?.status === "partial" &&
                      "bg-status-partial text-status-partial-foreground",
                    result?.status === "executed" && "bg-muted text-foreground",
                  )}
                >
                  {result?.status === "passed" && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {result?.status === "failed" && <X className="h-3.5 w-3.5" />}
                  {result?.status === "running" && (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {result?.status === "partial" && (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {result?.status === "executed" && (
                    <FileCode2 className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-foreground">
                    {result?.status === "running"
                      ? "Running code..."
                      : result?.caseLabel || `Test Case ${index + 1}`}
                  </p>
                  {result?.status !== "running" &&
                    result?.runtime &&
                    result?.memory && (
                      <p className="text-xs text-muted-foreground">
                        Runtime: {result.runtime} | Memory: {result.memory}
                      </p>
                    )}
                </div>
              </div>

              {result?.input?.length >= 0 && (
                <Accordion type="single" collapsible className="mt-2">
                  <AccordionItem value="input" className="border-border">
                    <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:text-foreground">
                      Input
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-2 rounded text-xs text-foreground font-mono whitespace-pre-wrap">
                        {result?.input}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Output Section */}
              {result?.status !== "running" && result?.output && (
                <div className="mt-3 rounded-md bg-muted p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Output:
                  </p>
                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-foreground font-mono">
                    {result.output}
                  </pre>
                </div>
              )}

              {result?.status !== "running" &&
                !result?.isCustom &&
                typeof result?.expectedOutput === "string" && (
                  <div className="mt-3 rounded-md bg-muted p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Expected Output:
                    </p>
                    <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-foreground font-mono">
                      {result.expectedOutput}
                    </pre>
                  </div>
                )}

              {/* Error Section */}
              {result?.status === "failed" && result?.error && (
                <div className="mt-3 rounded-md bg-muted border border-destructive/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <p className="text-xs font-medium text-destructive">
                      Error:
                    </p>
                  </div>
                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-destructive font-mono">
                    {result?.error}
                  </pre>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {isRunning ? (
              <div className="flex flex-col items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent mb-2"></div>
                <span>{codeStatus}</span>
              </div>
            ) : (
              "Run your code to see test results"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
