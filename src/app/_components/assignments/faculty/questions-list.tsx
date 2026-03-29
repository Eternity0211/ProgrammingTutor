"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Code } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/_components/ui/accordion";
import { QuestionForm } from "./question-form";
import { Question } from "@/lib/types/assignment-tyes";

interface QuestionsListProps {
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
}

export function QuestionsList({
  questions,
  onQuestionsChange,
}: QuestionsListProps) {
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastAddedQuestionId = useRef<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string>("1");

  useEffect(() => {
    if (lastAddedQuestionId.current) {
      requestAnimationFrame(() => {
        const questionElement =
          questionRefs.current[lastAddedQuestionId.current!];
        if (questionElement) {
          questionElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          lastAddedQuestionId.current = null;
        }
      });
    }
  }, [questions]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `${questions.length + 1}`,
      title: "",
      description: "",
      language: "C++",
      cppStandard: "c++17",
      testCases: [
        {
          id: "1",
          input: "",
          expectedOutput: "",
          hidden: false,
        },
      ],
      symbolicRules: [],
    };
    lastAddedQuestionId.current = newQuestion.id;
    setOpenAccordion(newQuestion.id);
    onQuestionsChange([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      onQuestionsChange(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    onQuestionsChange(newQuestions);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Questions</h2>
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="gap-1 border border-border"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      <AnimatePresence>
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            ref={(el) => {
              questionRefs.current[question.id] = el;
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Accordion
              type="single"
              collapsible
              value={openAccordion}
              onValueChange={setOpenAccordion}
            >
              <AccordionItem
                value={question.id}
                className="relative rounded-2xl border border-border bg-background"
              >
                <AccordionTrigger className="px-6 py-4 pr-16 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {question.title || `Question ${index + 1}`}
                    </span>
                  </div>
                </AccordionTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQuestion(index);
                  }}
                  disabled={questions.length <= 1}
                  className="absolute right-10 top-3 z-10 h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <AccordionContent className="px-6 pb-6">
                  <QuestionForm
                    question={question}
                    onChange={(updatedQuestion) =>
                      updateQuestion(index, updatedQuestion)
                    }
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
