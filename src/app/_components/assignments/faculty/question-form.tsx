"use client";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Separator } from "@/app/_components/ui/separator";
import { Question } from "@/lib/types/assignment-tyes";
import { LANGUAGE_ID_MAP } from "@/config/constants";
import { LanguageIcon } from "../../ui/language-icon";
import { Language } from "@/lib/types/config-types";
import { TestCasesList } from "./test-cases-list";
import { SymbolicRuleSelector } from "./symbolic-rule-selector";

import { ShieldCheck } from "lucide-react";

interface QuestionFormProps {
  question: Question;
  onChange: (question: Question) => void;
}

export function QuestionForm({ question, onChange }: QuestionFormProps) {
  const updateField = (field: keyof Question, value: any) => {
    onChange({
      ...question,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label
            htmlFor={`question-${question.id}-title`}
            className="text-foreground"
          >
            Question Title
          </Label>
          <Input
            id={`question-${question.id}-title`}
            value={question.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g., Implement a Binary Search Tree"
            className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor={`question-${question.id}-description`}
            className="text-foreground"
          >
            Description
          </Label>
          <Textarea
            id={`question-${question.id}-description`}
            value={question.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Provide detailed instructions for this question..."
            className="min-h-32 resize-y bg-background border border-border text-foreground placeholder:text-muted-foreground"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`question-${question.id}-language`}>
              Programming Language
            </Label>
            <Select
              value={question.language}
              onValueChange={(value) => updateField("language", value)}
            >
              <SelectTrigger
                id={`question-${question.id}-language`}
                className="bg-background border-border"
              >
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(LANGUAGE_ID_MAP).map((language) => (
                  <SelectItem key={language} value={language}>
                    <div className="flex items-center gap-2">
                      <LanguageIcon
                        language={language as Language}
                        showText={false}
                      />
                      <span
                        className={language === "cpp" ? "text-sky-400" : ""}
                      >
                        {language}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 新增：C++ 标准选择 */}
          <div className="grid gap-2">
            <Label htmlFor={`question-${question.id}-standard`}>
              C++ Standard
            </Label>
            <Select
              value={question.cppStandard}
              onValueChange={(value) => updateField("cppStandard", value)}
            >
              <SelectTrigger
                id={`question-${question.id}-standard`}
                className="bg-background border-border"
              >
                <SelectValue placeholder="Select standard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="c++11">C++11</SelectItem>
                <SelectItem value="c++17">C++17</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* <div className="grid gap-2">
          <Label>Symbolic Analysis Rules</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select specific C++ static analysis rules to be enforced for this question.
          </p>
          <SymbolicRuleSelector
            selectedRules={question.symbolicRules || []} 
            onChange={(rules) => updateField("symbolicRules", rules)}
          />
        </div> */}
      </div>

      <Separator className="my-6 bg-border" />

      <TestCasesList
        testCases={question.testCases}
        onTestCasesChange={(testCases) => updateField("testCases", testCases)}
        questionTitle={question.title}
        questionDescription={question.description}
        questionLanguage={question.language}
        questionId={question.id}
      />

      <Separator className="my-6 bg-border" />
      <div className="grid gap-2 mt-4">
        {/* 保持标题和语义结构，但移除图标 */}
        <Label className="text-base font-semibold">
          Neuro-Symbolic Analysis Rules
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Select specific static analysis rules from the platform library to
          apply for this question. You can also define custom rules in the rules
          library.
        </p>
        <SymbolicRuleSelector
          selectedRules={question.symbolicRules || []}
          onChange={(rules) => updateField("symbolicRules", rules)}
        />
      </div>
    </div>
  );
}
