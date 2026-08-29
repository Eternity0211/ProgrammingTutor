"use client";

import { useEffect, useState } from "react";
import { SubmissionStatus } from "@prisma/client";
import { AssignmentById, StudentProgress } from "@/lib/types/assignment-tyes";
import { getStudentAssignmentProgress } from "@/server/actions/submission-actions";

// Import modular components
import { AssignmentHeader } from "./assignment-header";
import { FacultyStatsCards } from "./faculty-stats-cards";
import { StudentProgressSection } from "./student-progress-section";

interface FacultyViewProps {
  assignment: AssignmentById;
  classCode: string;
  initialStudents: StudentProgress[];
}

export function FacultyView({
  assignment,
  classCode,
  initialStudents,
}: FacultyViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<StudentProgress[]>(initialStudents);
  const [loading, setLoading] = useState(false);

  // Load student progress data
  const loadStudentProgress = async () => {
    try {
      setLoading(true);
      const data = await getStudentAssignmentProgress(assignment.id, classCode);
      setStudents(data);
    } catch (error) {
      console.error("Failed to load student progress:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentProgress();
  }, [assignment.id, classCode]);

  const totalStudents = students.length;
  const completedCount = students.filter(
    (s) => s.status === SubmissionStatus.COMPLETED,
  ).length;
  const inProgressCount = students.filter(
    (s) => s.status === SubmissionStatus.IN_PROGRESS,
  ).length;
  const notStartedCount = students.filter(
    (s) => s.status === SubmissionStatus.NOT_STARTED,
  ).length;

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <AssignmentHeader assignment={assignment} classCode={classCode} />

      <FacultyStatsCards
        totalStudents={totalStudents}
        completedCount={completedCount}
        inProgressCount={inProgressCount}
        notStartedCount={notStartedCount}
      />

      <div className="mt-8">
        <StudentProgressSection
          students={students}
          filteredStudents={filteredStudents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          questionsCount={assignment.questions.length}
          classCode={classCode}
          assignmentId={assignment.id}
        />
      </div>
    </div>
  );
}
