"use client";

import { Check, Clock } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";
import { Question } from "@/lib/types/assignment-tyes";

interface QuestionNavProps {
  questions: Question[];
  currentIndex: number;
  onSelect: (index: number) => void;
  completedQuestionIds?: string[];
}

export function QuestionNav({
  questions,
  currentIndex,
  onSelect,
  completedQuestionIds = [],
}: QuestionNavProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {questions.map((question, index) => (
        <Button
          key={question.id}
          variant="ghost"
          onClick={() => onSelect(index)}
          className={cn(
            "h-8 gap-1.5 rounded-full px-3 text-sm",
            currentIndex === index && "bg-accent",
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black dark:bg-black dark:text-white text-xs">
            {index + 1}
          </span>
          <span className="hidden sm:inline">{question.title}</span>
          {completedQuestionIds.includes(question.id) ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      ))}
    </div>
  );
}
