"use client";
import { Separator } from "@/app/_components/ui/separator";
import { Question } from "@/lib/types/assignment-tyes";

interface QuestionDescriptionProps {
  question: Question;
}

export function QuestionDescription({ question }: QuestionDescriptionProps) {
  return (
    <div className="prose prose-slate max-w-none">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-2xl font-medium">{question.title}</h1>
      </div>
      <Separator className="my-4" />

      <div className="[&>h2]:text-lg [&>h2]:font-medium [&>p]:text-muted-foreground [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-lg">
        <div dangerouslySetInnerHTML={{ __html: question.description }} />

        <h2>Example Test Cases:</h2>
        {question.testCases
          .filter((testCase) => !testCase.hidden)
          .map((testCase) => (
            <div
              key={testCase.id}
              className="mb-6 rounded-lg border border-border p-4"
            >
              <div className="mb-2">
                <strong className="text-sm font-medium ">Input:</strong>
                <pre className="mt-1 rounded bg-muted p-2 text-sm">
                  {testCase.input}
                </pre>
              </div>
              <div>
                <strong className="text-sm font-medium">
                  Expected Output:
                </strong>
                <pre className="mt-1 rounded bg-muted p-2 text-sm">
                  {testCase.expectedOutput}
                </pre>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
