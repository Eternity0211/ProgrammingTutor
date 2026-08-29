"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { Badge } from "@/app/_components/ui/badge";
import { EditableScore } from "@/app/_components/ui/editable-score";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  GradingTableStudent,
  AssignmentMetricInfo,
} from "@/lib/types/assignment-tyes";
import { formatDistanceToNow } from "date-fns";

interface SubmissionDetailsDialogProps {
  student: GradingTableStudent;
  metrics: AssignmentMetricInfo[];
  isOpen: boolean;
  onClose: () => void;
  onScoreChange?: (
    submissionId: string,
    metricId: string,
    newScore: number,
  ) => void;
}

export function SubmissionDetailsDialog({
  student,
  metrics,
  isOpen,
  onClose,
  onScoreChange,
}: SubmissionDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold">{student.name}</div>
              <div className="text-sm text-muted-foreground">
                {student.email}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <StatusBadge status={student.status} />
              <Badge variant="outline">
                Overall: {student.overallScore.toFixed(1)}%
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Overall Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Test Cases</div>
                <div className="font-semibold">
                  {student.overallSubmission.testCaseScore.toFixed(1)}%
                </div>
              </div>
              {metrics.map((metric) => {
                const metricScore =
                  student.overallSubmission?.metricScores.find(
                    (m) => m.metricId === metric.id,
                  );
                return (
                  <div key={metric.id}>
                    <div className="text-sm text-muted-foreground">
                      {metric.name}
                    </div>
                    <div className="font-semibold">
                      {(metricScore?.score || 0).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Submissions
                </div>
                <div className="font-semibold">
                  {student.submissions.length}
                </div>
              </div>
            </div>
          </div>

          {/* Individual Submissions */}
          <div>
            <h3 className="font-medium mb-3">Individual Submissions</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Test Cases</TableHead>
                    {metrics.map((metric) => (
                      <TableHead key={metric.id}>{metric.name}</TableHead>
                    ))}
                    <TableHead>Total Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.submissions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4 + metrics.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No submissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.submissions.map((submission, index) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={submission.status} />
                        </TableCell>
                        <TableCell>
                          {submission.submittedAt ? (
                            <div className="text-sm">
                              {formatDistanceToNow(
                                new Date(submission.submittedAt),
                                { addSuffix: true },
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Not submitted
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <EditableScore
                            value={submission.testCaseScore || 0}
                            onChange={(newScore) =>
                              onScoreChange?.(
                                submission.id,
                                "testCases",
                                newScore,
                              )
                            }
                          />
                        </TableCell>
                        {metrics.map((metric) => {
                          const metricScore = submission.metricScores?.find(
                            (m) => m.metricId === metric.id,
                          );
                          return (
                            <TableCell key={metric.id}>
                              <EditableScore
                                value={metricScore?.score || 0}
                                onChange={(newScore) =>
                                  onScoreChange?.(
                                    submission.id,
                                    metric.id,
                                    newScore,
                                  )
                                }
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <div className="font-bold">
                            {(submission.totalScore || 0).toFixed(1)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
