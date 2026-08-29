"use client";

import { motion } from "framer-motion";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { StudentProgress } from "@/lib/types/assignment-tyes";
import { SubmissionStatus } from "@prisma/client";
import { setStudentCookie } from "@/server/actions/utility-actions";

interface StudentListItemProps {
  student: StudentProgress;
  questionsCount: number;
  classCode: string;
  assignmentId: string;
}

export function StudentListItem({
  student,
  questionsCount,
  classCode,
  assignmentId,
}: StudentListItemProps) {
  const handleViewDetails = async () => {
    await setStudentCookie(student.id);
    window.location.href = `/classes/${classCode}/${assignmentId}/submissions`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-4"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={student.avatar} alt={student.name} />
          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{student.name}</p>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {student.questionsCompleted} / {questionsCount} Questions
          </p>
          {student.status === SubmissionStatus.COMPLETED && (
            <p className="text-sm text-muted-foreground">
              Score: {student.score}%
            </p>
          )}
        </div>
        <StatusBadge status={student.status} />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </div>
    </motion.div>
  );
}
