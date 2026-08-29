"use client";

import { useState } from "react";
import { MoreHorizontal, Edit3, Eye } from "lucide-react";
import { TableCell, TableRow } from "@/app/_components/ui/table";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Button } from "@/app/_components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/_components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { SubmissionDetailsDialog } from "./submission-details-dialog";
import {
  GradingTableColumn,
  GradingTableStudent,
  AssignmentMetricInfo,
} from "@/lib/types/assignment-tyes";

interface GradingTableRowProps {
  student: GradingTableStudent;
  columns: GradingTableColumn[];
  metrics: AssignmentMetricInfo[];
  isSelected: boolean;
  onSelect: (studentId: string, checked: boolean) => void;
  onScoreChange?: (
    submissionId: string,
    metricId: string,
    newScore: number,
  ) => void;
}

export function GradingTableRow({
  student,
  columns,
  metrics,
  isSelected,
  onSelect,
  onScoreChange,
}: GradingTableRowProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <TableRow>
      {columns.map((column) => {
        if (column.key === "select") {
          return (
            <TableCell key={column.key}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onSelect(student.id, checked as boolean)
                }
              />
            </TableCell>
          );
        }

        if (column.key === "student") {
          return (
            <TableCell key={column.key}>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={student.avatar} />
                  <AvatarFallback>
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.email}
                  </div>
                </div>
              </div>
            </TableCell>
          );
        }

        if (column.key === "testCases") {
          return (
            <TableCell key={column.key}>
              <div className="font-medium">
                {student.overallSubmission.testCaseScore.toFixed(1)}%
              </div>
            </TableCell>
          );
        }

        if (column.key.startsWith("metric_")) {
          const metricId = column.key.replace("metric_", "");
          const metricScore = student.overallSubmission?.metricScores.find(
            (m) => m.metricId === metricId,
          );
          return (
            <TableCell key={column.key}>
              <div className="font-medium">
                {(metricScore?.score || 0).toFixed(1)}%
              </div>
            </TableCell>
          );
        }

        if (column.key === "overallScore") {
          return (
            <TableCell key={column.key}>
              <div className="font-bold text-lg">
                {student.overallSubmission.totalScore.toFixed(1)}%
              </div>
            </TableCell>
          );
        }

        if (column.key === "status") {
          return (
            <TableCell key={column.key}>
              <StatusBadge status={student.status} />
            </TableCell>
          );
        }

        if (column.key === "actions") {
          return (
            <TableCell key={column.key}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Scores
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Submission
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          );
        }

        return <TableCell key={column.key}></TableCell>;
      })}

      <SubmissionDetailsDialog
        metrics={columns
          .filter((c) => c.key.startsWith("metric_"))
          .map((c) => ({
            id: c.key.replace("metric_", ""),
            name: c.label,
            weight: 0,
          }))}
        student={student}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onScoreChange={onScoreChange}
      />
    </TableRow>
  );
}
