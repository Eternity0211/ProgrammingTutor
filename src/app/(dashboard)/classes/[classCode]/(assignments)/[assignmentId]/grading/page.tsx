import { BarChart3 } from "lucide-react";
import { BackButton } from "@/app/_components/ui/back-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { GradingTableClient } from "@/app/_components/assignments/tables/grading-table-client";
import { getStudentAssignmentProgress } from "@/server/actions/submission-actions";
import {
  getAssignmentById,
  getAssignmentGradingTableHeader,
} from "@/server/actions/assignment-actions";
import { transformStudentDataForGrading } from "@/lib/utils";

interface GradingPageProps {
  params: Promise<{ assignmentId: string; classCode: string }>;
}

export default async function GradingPage({ params }: GradingPageProps) {
  const { assignmentId, classCode } = await params;

  // Fetch assignment data and grading table header server-side
  const [assignmentData, headerData, studentData] = await Promise.all([
    getAssignmentById(assignmentId),
    getAssignmentGradingTableHeader(assignmentId),
    getStudentAssignmentProgress(assignmentId, classCode),
  ]);

  if (!headerData.success) {
    throw new Error(headerData.error || "Failed to load grading table header");
  }

  if (!assignmentData.assignment) {
    throw new Error("Assignment not found");
  }

  const transformedData = transformStudentDataForGrading(
    studentData,
    headerData.assignment,
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">
              {assignmentData.assignment.title} - Grading Table
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed grading and evaluation for all students
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transformedData.students.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transformedData.students.length > 0
                ? (
                    transformedData.students.reduce(
                      (sum, student) => sum + student.overallScore,
                      0,
                    ) / transformedData.students.length
                  ).toFixed(1)
                : "0"}
              %
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                transformedData.students.filter(
                  (student) => student.status === "COMPLETED",
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                transformedData.students.filter(
                  (student) => student.status !== "COMPLETED",
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <GradingTableClient
        data={transformedData}
        columns={headerData.columns}
        assignmentId={assignmentId}
        classCode={classCode}
      />
    </div>
  );
}
