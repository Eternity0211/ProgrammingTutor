"use client";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export default function ({ testCase, onChange }: any) {
  return (
    <Card className="rounded-xl border border-border bg-background">
      <CardContent className="p-4">
        <div className="flex items-center justify-between pb-3">
          <h4 className="text-sm font-medium text-foreground">
            Sample Test Case
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label
              htmlFor={`test-case-sample-input`}
              className="text-xs text-muted-foreground"
            >
              Input
            </Label>
            <Textarea
              id={`test-case-sample-input`}
              value={testCase.input}
              onChange={(e) => onChange("input", e.target.value)}
              placeholder="Input for this test case..."
              className="h-24 resize-none border border-border text-sm"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor={`test-case-sample-output`}
              className="text-xs text-muted-foreground"
            >
              Expected Output
            </Label>
            <Textarea
              id={`test-case-sample-output`}
              value={testCase.expectedOutput}
              onChange={(e) => onChange("expectedOutput", e.target.value)}
              placeholder="Expected output for this test case..."
              className="h-24 resize-none border border-border text-sm"
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
