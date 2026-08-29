"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Target, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Slider } from "@/app/_components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { createMetric } from "@/server/actions/metric-actions";
import { toast } from "sonner";

export interface EvaluationMetric {
  id: string;
  name: string;
  description?: string;
  weight: number;
}

export interface ExistingMetric {
  id: string;
  name: string;
  description: string | null;
}

interface EvaluationMetricsProps {
  metrics: EvaluationMetric[];
  onMetricsChange: (metrics: EvaluationMetric[]) => void;
  existingMetrics?: ExistingMetric[];
  testCaseWeight?: number;
  metricsWeight?: number;
  onWeightageChange?: (testCaseWeight: number, metricsWeight: number) => void;
}

export function EvaluationMetrics({
  metrics,
  onMetricsChange,
  existingMetrics = [],
  testCaseWeight = 60,
  metricsWeight = 40,
  onWeightageChange,
}: EvaluationMetricsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricDescription, setNewMetricDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const isValidWeight = totalWeight === 100;

  // If no metrics are present, test cases should have full weightage
  const effectiveTestCaseWeight = metrics.length === 0 ? 100 : testCaseWeight;
  const effectiveMetricsWeight = metrics.length === 0 ? 0 : metricsWeight;

  const addMetric = (metric: ExistingMetric) => {
    const newMetric: EvaluationMetric = {
      id: metric.id,
      name: metric.name,
      description: metric.description || undefined,
      weight: 0,
    };

    const updatedMetrics = [...metrics, newMetric];

    if (updatedMetrics.length === 1) {
      updatedMetrics[0].weight = 100;
    } else {
      const existingWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
      const remainingWeight = 100 - existingWeight;
      newMetric.weight = Math.max(0, remainingWeight);
    }

    onMetricsChange(updatedMetrics);
  };

  const removeMetric = (index: number) => {
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const updateMetricWeight = (index: number, weight: number) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], weight };
    onMetricsChange(newMetrics);
  };

  const handleCreateMetric = async () => {
    if (!newMetricName.trim()) return;
    setIsCreating(true);
    const toastId = toast.loading("Creating metric...");
    try {
      const response = await createMetric({
        name: newMetricName.trim(),
        description: newMetricDescription.trim() || undefined,
      });
      if (response.status === "success" && response.metric) {
        const metric: ExistingMetric = {
          id: response.metric.id,
          name: response.metric.name,
          description: response.metric.description,
        };
        addMetric(metric);
        toast.success("Metric created successfully", {
          id: toastId,
        });
      } else {
        toast.error("Failed to create metric", {
          id: toastId,
        });
      }

      setNewMetricName("");
      setNewMetricDescription("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create metric:", error);
      toast.error("Failed to create metric", {
        id: toastId,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleWeightageChange = (values: number[]) => {
    if (onWeightageChange && values.length > 0) {
      const newTestCaseWeight = values[0];
      const newMetricsWeight = 100 - newTestCaseWeight;
      onWeightageChange(newTestCaseWeight, newMetricsWeight);
    }
  };

  const availableMetrics: ExistingMetric[] = existingMetrics;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">
              Evaluation Metrics
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Evaluation metrics help assess code quality beyond just test
                  case results. They can evaluate factors like code readability,
                  efficiency, documentation, and best practices.
                </p>
                <p className="mt-2">
                  <strong>Scoring:</strong> You set the overall split between
                  test cases and metrics, then individual metric weights are
                  calculated within the metrics portion.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1 border border-border"
                >
                  <Plus className="h-4 w-4" />
                  Add Metric
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {availableMetrics.length > 0 ? (
                  <>
                    {availableMetrics.map((metric) => (
                      <DropdownMenuItem
                        key={metric.id}
                        onClick={() => addMetric(metric)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{metric.name}</span>
                          {metric.description && (
                            <span className="text-xs text-muted-foreground">
                              {metric.description}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <DropdownMenuItem disabled>
                    No available metrics
                  </DropdownMenuItem>
                )}
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Metric
                  </DropdownMenuItem>
                </>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Evaluation Metric</DialogTitle>
                  <DialogDescription>
                    Create a new evaluation metric that can be reused across
                    assignments.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="metric-name" className="text-foreground">
                      Metric Name
                    </Label>
                    <Input
                      id="metric-name"
                      value={newMetricName}
                      onChange={(e) => setNewMetricName(e.target.value)}
                      placeholder="e.g., Code Quality, Correctness"
                      className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="metric-description"
                      className="text-foreground"
                    >
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="metric-description"
                      value={newMetricDescription}
                      onChange={(e) => setNewMetricDescription(e.target.value)}
                      placeholder="Describe what this metric evaluates..."
                      className="min-h-20 resize-y bg-background border border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border border-border text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateMetric}
                    disabled={!newMetricName.trim() || isCreating}
                    className="bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Metric"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Weightage Distribution Slider */}
        <Card className="rounded-2xl border border-border bg-background">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">
                  Final Score Distribution
                </Label>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Test Cases: {effectiveTestCaseWeight}%
                  </span>
                  <span className="text-muted-foreground">
                    Metrics: {effectiveMetricsWeight}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[effectiveTestCaseWeight]}
                  onValueChange={handleWeightageChange}
                  max={100}
                  min={0}
                  step={5}
                  disabled={metrics.length === 0}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100% Test Cases</span>
                  <span>100% Metrics</span>
                </div>
              </div>
              {metrics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add evaluation metrics to enable weightage distribution.
                  Currently, test cases have full weightage.
                </p>
              )}
              {metrics.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>How it works:</strong> Individual metric weights are
                    calculated within the {effectiveMetricsWeight}% metrics
                    portion of the final score.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="flex justify-between">
                        <span>{metric.name}:</span>
                        <span>
                          {(
                            (metric.weight / 100) *
                            effectiveMetricsWeight
                          ).toFixed(1)}
                          % of final score
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isValidWeight && metrics.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total weightage must equal 100%. Current total: {totalWeight}%
            </AlertDescription>
          </Alert>
        )}

        <AnimatePresence>
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-2xl border border-border bg-background">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">
                          {metric.name}
                        </h4>
                        {metric.description && (
                          <span className="text-sm text-muted-foreground">
                            - {metric.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`weight-${index}`}
                            className="text-sm text-foreground"
                          >
                            Weight within metrics:
                          </Label>
                          <Input
                            id={`weight-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            value={metric.weight}
                            onChange={(e) =>
                              updateMetricWeight(
                                index,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="w-20 bg-background border border-border text-foreground"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ={" "}
                          {(
                            (metric.weight / 100) *
                            effectiveMetricsWeight
                          ).toFixed(1)}
                          % of final score
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMetric(index)}
                      className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove metric</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {metrics.length === 0 && (
          <Card className="rounded-2xl border border-border bg-background">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No evaluation metrics added yet. Add metrics to define how
                  assignments will be graded.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
