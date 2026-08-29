import { Badge } from "./badge";
import { SubmissionStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: SubmissionStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return {
          color:
            "bg-status-not-started text-status-not-started-foreground border-status-not-started",
          label: "Not Started",
        };
      case "IN_PROGRESS":
        return {
          color:
            "bg-status-in-progress text-status-in-progress-foreground border-status-in-progress",
          label: "In Progress",
        };
      case "LATE_SUBMISSION":
        return {
          color:
            "bg-status-late text-status-late-foreground border-status-late",
          label: "Late Submission",
        };
      case "COMPLETED":
      case "EVALUATION_COMPLETE":
        return {
          color:
            "bg-status-completed text-status-completed-foreground border-status-completed",
          label: "Completed",
        };
      case "PARTIAL":
        return {
          color:
            "bg-status-partial text-status-partial-foreground border-status-partial",
          label: "Partial",
        };
      case "FAILED":
        return {
          color:
            "bg-status-failed text-status-failed-foreground border-status-failed",
          label: "Failed",
        };
      default:
        return {
          color:
            "bg-status-not-started text-status-not-started-foreground border-status-not-started",
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={`${config.color} hover:opacity-80 transition-opacity ${className}`}
    >
      {config.label}
    </Badge>
  );
}
