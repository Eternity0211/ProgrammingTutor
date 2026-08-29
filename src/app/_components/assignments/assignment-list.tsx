"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { AssignmentCard } from "./assignment-card";
import { Button } from "@/app/_components/ui/button";
import { Role } from "@prisma/client";
import { Assignment } from "@/lib/types/assignment-tyes";

interface AssignmentListProps {
  classCode: string;
  role: Role;
  assignments: Assignment[];
}

export function AssignmentList({
  classCode,
  role,
  assignments,
}: AssignmentListProps) {
  const router = useRouter();
  const handleCreateAssignment = () => {
    router.push(`/classes/${classCode}/create`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">Assignments</h2>
        {role === "FACULTY" && (
          <Button
            onClick={handleCreateAssignment}
            className="gap-1 bg-primary-button text-white hover:bg-primary-button-hover"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground">No assignments yet.</p>
            {role === "FACULTY" && (
              <Button
                variant="outline"
                className="mt-4 border-border"
                onClick={handleCreateAssignment}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first assignment
              </Button>
            )}
          </div>
        ) : (
          assignments.map((assignment, index) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <AssignmentCard assignment={assignment} classCode={classCode} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
