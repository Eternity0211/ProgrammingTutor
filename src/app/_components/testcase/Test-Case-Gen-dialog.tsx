"use client";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import { Label } from "@/app/_components/ui/label";
import { Loader2, Wand2 } from "lucide-react";
import { Slider } from "../ui/slider";
import { useState } from "react";
import SampleTCIOCard from "./SampleTC-IO-card";
import { toast } from "sonner";
import { Question, TestCase } from "@/lib/types/assignment-tyes";

interface TestCaseGenDialogProps {
  title: string;
  description: string;
  language: string;
  updateField: <K extends keyof Question>(field: K, value: Question[K]) => void;
  existingTestCases: TestCase[];
  onGenerated?: (generatedCases: any[]) => void;
}

export default function TestCaseGenarationDialog({
  title,
  description,
  language,
  updateField,
  existingTestCases,
  onGenerated,
}: TestCaseGenDialogProps) {
  const [number, SetNumber] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCase, setTestCase] = useState<Omit<TestCase, "id" | "hidden">>({
    input: "",
    expectedOutput: "",
  });
  const [open, setOpen] = useState(false);

  const updateTestCase = (
    field: keyof Omit<TestCase, "id" | "hidden">,
    value: string,
  ) => {
    setTestCase((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateTestCases = async () => {
    if (!title || !description) {
      toast.warning("Please fill in the question title and description first");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-testcases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionTitle: title,
          questionDescription: description,
          language: language,
          sampleInput: testCase.input,
          sampleOutput: testCase.expectedOutput,
          noOfTCRequired: number,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.error || "Failed to generate test cases");
      }

      const { testCases } = responseData;

      const newTestCases = testCases.map(
        (tc: Omit<TestCase, "id">, index: number) => ({
          ...tc,
          id: `generated-${existingTestCases.length + index + 1}`,
        }),
      );

      updateField("testCases", [...existingTestCases, ...newTestCases]);

      toast.success("Test cases generated successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Error generating test cases:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate test cases. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-1 border-border text-foreground hover:bg-muted"
        >
          <Wand2 className="h-4 w-4" />
          Generate Test Cases
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate test cases</DialogTitle>
          <DialogDescription>
            Auto generate test cases for the above question using AI.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3">
            <Label htmlFor="name-1">Number of test cases: {number}</Label>
            <Slider
              defaultValue={[5]}
              max={10}
              step={1}
              value={[number]}
              onValueChange={(value) => SetNumber(value[0])}
            />
          </div>
          <div className="grid gap-3">
            <SampleTCIOCard onChange={updateTestCase} testCase={testCase} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={generateTestCases}
            disabled={isGenerating}
            className="gap-1 bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Auto-Generate Test Cases
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
