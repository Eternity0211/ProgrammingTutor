"use client";

import { useState, useTransition } from "react";
import {
  updateStudentScore,
  performBulkAction,
} from "@/server/actions/grading-actions";
import { getStudentAssignmentProgress } from "@/server/actions/submission-actions";
import { getAssignmentGradingTableHeader } from "@/server/actions/assignment-actions";
import {
  transformStudentDataForGrading,
  exportGradingTableToCSV,
} from "@/lib/utils";
import { toast } from "sonner";
import { GradingTable } from "./grading-table";
import {
  GradingTableColumn,
  GradingTableData,
} from "@/lib/types/assignment-tyes";

interface GradingTableClientProps {
  data: GradingTableData;
  columns: GradingTableColumn[];
  assignmentId: string;
  classCode: string;
}

export function GradingTableClient({
  data,
  columns,
  assignmentId,
  classCode,
}: GradingTableClientProps) {
  const [gradingData, setGradingData] = useState<GradingTableData>(data);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const handleScoreChange = async (
    codeSubmissionId: string,
    metricId: string,
    newScore: number,
  ) => {
    try {
      const result = await updateStudentScore(
        codeSubmissionId,
        metricId,
        newScore,
      );

      if (result.success) {
        setGradingData((prev) => ({
          ...prev,
          students: prev.students.map((student) => ({
            ...student,
            submissions: student.submissions.map((sub) => {
              if (sub.id === codeSubmissionId) {
                if (metricId === "testCases") {
                  return {
                    ...sub,
                    testCaseScore: newScore,
                  };
                } else {
                  return {
                    ...sub,
                    metricScores: sub.metricScores.map((metric) => {
                      if (metric.metricId === metricId) {
                        return { ...metric, score: newScore };
                      }
                      return metric;
                    }),
                  };
                }
              }
              return sub;
            }),
          })),
        }));

        toast.success("Score updated successfully");
      } else {
        toast.error(result.error || "Failed to update score");
      }
    } catch (error) {
      console.error("Failed to update score:", error);
      toast.error("Failed to update score");
    }
  };

  const handleBulkAction = async (action: string, studentIds: string[]) => {
    try {
      const result = await performBulkAction(action, studentIds, assignmentId);

      if (result.success) {
        toast.success(
          `${action} action performed on ${studentIds.length} students`,
        );
      } else {
        toast.error(result.error || "Failed to perform bulk action");
      }
    } catch (error) {
      console.error("Failed to perform bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const handleRefresh = () => {
    startRefreshTransition(async () => {
      try {
        const [headerData, studentData] = await Promise.all([
          getAssignmentGradingTableHeader(assignmentId),
          getStudentAssignmentProgress(assignmentId, classCode),
        ]);

        if (headerData.success) {
          const transformedData = transformStudentDataForGrading(
            studentData,
            headerData.assignment,
          );
          setGradingData(transformedData);
          toast.success("Data refreshed successfully");
        } else {
          toast.error(headerData.error || "Failed to refresh data");
        }
      } catch (error) {
        console.error("Failed to refresh data:", error);
        toast.error("Failed to refresh data");
      }
    });
  };

  const handleExport = () => {
    startExportTransition(async () => {
      try {
        // First refresh data to get the latest information
        const [headerData, studentData] = await Promise.all([
          getAssignmentGradingTableHeader(assignmentId),
          getStudentAssignmentProgress(assignmentId, classCode),
        ]);

        if (headerData.success) {
          const freshData = transformStudentDataForGrading(
            studentData,
            headerData.assignment,
          );

          // Export with fresh data
          exportGradingTableToCSV(freshData.students, freshData);
          toast.success("CSV exported successfully with latest data");
        } else {
          toast.error(
            headerData.error || "Failed to fetch latest data for export",
          );
        }
      } catch (error) {
        console.error("Failed to export CSV:", error);
        toast.error("Failed to export CSV");
      }
    });
  };

  return (
    <GradingTable
      data={gradingData}
      columns={columns}
      assignmentId={assignmentId}
      onScoreChange={handleScoreChange}
      onBulkAction={handleBulkAction}
      onRefresh={handleRefresh}
      onExport={handleExport}
      isRefreshing={isRefreshing}
      isExporting={isExporting}
    />
  );
}
