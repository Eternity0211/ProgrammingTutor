"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { StudentProgress } from "@/lib/types/assignment-tyes";
import { FacultyActionsToolbar } from "./faculty-actions-toolbar";
import { StudentListItem } from "./student-list-item";

interface StudentProgressSectionProps {
  students: StudentProgress[];
  filteredStudents: StudentProgress[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  questionsCount: number;
  classCode: string;
  assignmentId: string;
}

export function StudentProgressSection({
  students,
  filteredStudents,
  searchQuery,
  onSearchChange,
  questionsCount,
  classCode,
  assignmentId,
}: StudentProgressSectionProps) {
  return (
    <Card className="rounded-2xl border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Student Progress</CardTitle>
          <FacultyActionsToolbar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            classCode={classCode}
            assignmentId={assignmentId}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {filteredStudents.map((student) => (
            <StudentListItem
              key={student.id}
              student={student}
              questionsCount={questionsCount}
              classCode={classCode}
              assignmentId={assignmentId}
            />
          ))}

          {filteredStudents.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No students found matching your search
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
