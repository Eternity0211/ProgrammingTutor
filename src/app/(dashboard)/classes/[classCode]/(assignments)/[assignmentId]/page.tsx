// src/app/(dashboard)/classes/[classCode]/(assignments)/[assignmentId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssignmentLayout } from "@/app/_components/assignments/student/assignment-layout";
import { FacultyView } from "@/app/_components/assignments/faculty/faculty-view";
import { getUserRole } from "@/server/actions/user-actions";
import { getAssignmentById } from "@/server/actions/assignment-actions";
import { getStudentAssignmentProgress } from "@/server/actions/submission-actions";
import { StudentProgress } from "@/lib/types/assignment-tyes";
import AiCodeReview from "@/app/_components/ai-code-review/ai-code-review";

export const metadata: Metadata = {
  title: "Assignment | gradeIT",
  description: "Complete your coding assignment",
};

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string; classCode: string }>;
}) {
  const { assignmentId, classCode } = await params;
  const { assignment } = await getAssignmentById(assignmentId);
  const { role } = await getUserRole();
  const initialStudentData: StudentProgress[] =
    await getStudentAssignmentProgress(assignmentId, classCode);

  if (!assignment) {
    notFound();
  }

  if (role === "FACULTY") {
    return (
      <FacultyView
        assignment={assignment}
        classCode={classCode}
        initialStudents={initialStudentData}
      />
    );
  }

  // 从 questions 数组中尝试获取第一个题目的初始代码
  // 如果 questions 为空，则回退到默认字符串
  // return <AssignmentLayout assignment={assignment} classCode={classCode} />;
  const defaultCode =
    assignment.questions?.[0]?.codeSubmission?.[0]?.code ||
    "// 在此编写代码...";

  return (
    <div className="relative min-h-screen">
      <AssignmentLayout assignment={assignment} classCode={classCode} />
    </div>
  );
}
