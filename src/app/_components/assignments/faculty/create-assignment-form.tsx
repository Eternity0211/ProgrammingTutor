"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { QuestionsList } from "./questions-list";
import {
  EvaluationMetrics,
  ExistingMetric,
  type EvaluationMetric,
} from "./evaluation-metrics";
import { createAssignment } from "@/server/actions/assignment-actions";
import { Question } from "@/lib/types/assignment-tyes";
import type { AssignmentSchema } from "@/lib/validators/schema";
import { toast } from "sonner";
import { Switch } from "../../ui/switch";
import { SymbolicRuleSelector } from "./symbolic-rule-selector";

interface CreateAssignmentFormProps {
  classCode: string;
  existingMetrics: ExistingMetric[];
}

export function CreateAssignmentForm({
  classCode,
  existingMetrics,
}: CreateAssignmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [copyPastePrevention, setCopypasteprevention] =
    useState<boolean>(false);
  const [fullScreenEnforcement, setFullScreenEnforcement] =
    useState<boolean>(false);
  const [selectedRules, setSelectedRules] = useState<string[]>([
    "CPP_ARRAY_OOB_LITERAL",
  ]);
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [testCaseWeight, setTestCaseWeight] = useState(60);
  const [metricsWeight, setMetricsWeight] = useState(40);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      title: "",
      description: "",
      language: "cpp",
      cppStandard: "c++17",
      testCases: [
        {
          id: "1",
          input: "",
          expectedOutput: "",
          hidden: false,
        },
      ],
      symbolicRules: ["CPP_ARRAY_OOB_LITERAL"],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleWeightageChange = (
    newTestCaseWeight: number,
    newMetricsWeight: number,
  ) => {
    setTestCaseWeight(newTestCaseWeight);
    setMetricsWeight(newMetricsWeight);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedQuestions: AssignmentSchema["questions"] = questions.map(
        (question) => ({
          ...question,
          cppStandard: question.cppStandard ?? "c++17",
        }),
      );

      const response = await createAssignment({
        title,
        description,
        dueDate,
        classCode,
        questions: normalizedQuestions,
        copyPastePrevention,
        fullScreenEnforcement,
        testCaseWeight,
        metricsWeight,
        metrics,
      });

      if (response.status === "success") {
        toast.success("Assignment created successfully!");
        router.push(`/classes/${classCode}`);
        router.refresh();
      } else {
        console.error(response.message);
        toast.warning("Failed to create assignment");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="rounded-2xl border border-border bg-background">
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-foreground">
                Assignment Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Binary Search Trees Implementation"
                className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed instructions for the assignment..."
                className="min-h-32 resize-y bg-background border border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate" className="text-foreground">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-background border border-border text-foreground"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="copyPastePrevention"
                  className="text-foreground"
                >
                  Disable copy paste
                </Label>
                <Switch
                  checked={copyPastePrevention}
                  onCheckedChange={() => setCopypasteprevention((c) => !c)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="fullScreenEnforcement"
                  className="text-foreground"
                >
                  Full screen enforcement
                </Label>
                <Switch
                  checked={fullScreenEnforcement}
                  onCheckedChange={() => setFullScreenEnforcement((c) => !c)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EvaluationMetrics
        metrics={metrics}
        onMetricsChange={setMetrics}
        existingMetrics={existingMetrics}
        testCaseWeight={testCaseWeight}
        metricsWeight={metricsWeight}
        onWeightageChange={handleWeightageChange}
      />

      <QuestionsList questions={questions} onQuestionsChange={setQuestions} />

      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border border-border text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className=" bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Assignment"}
        </Button>
      </div>
    </form>
  );
}
