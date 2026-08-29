"use client";

import Link from "next/link";
import { Calendar, FileText, Users, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Assignment } from "@/lib/types/assignment-tyes";

interface AssignmentCardProps {
  assignment: Assignment;
  classCode: string;
}

const parseDateInput = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateUTC = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.month} ${parts.day}, ${parts.year} at ${parts.hour}:${parts.minute} ${parts.dayPeriod} UTC`;
};

const formatDateOnlyUTC = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export function AssignmentCard({ assignment, classCode }: AssignmentCardProps) {
  const dueDate = parseDateInput(assignment.dueDate as Date | string | null);
  const createdAt = parseDateInput(assignment.createdAt as Date | string);

  const isOverdue = dueDate && new Date() > dueDate;
  const isDueSoon =
    !isOverdue &&
    dueDate &&
    new Date() > new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000);

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-md">
      <Link href={`/classes/${classCode}/${assignment.id}`} className="block">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-medium text-foreground">
              {assignment.title}
            </h3>
            {isOverdue ? (
              <Badge variant="destructive">Overdue</Badge>
            ) : isDueSoon ? (
              <Badge className="bg-muted text-foreground hover:bg-muted/70">
                Due Soon
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-border text-muted-foreground"
              >
                Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {assignment.description}
          </p>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due: {dueDate ? formatDateUTC(dueDate) : "No due date"}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {assignment.questionCount} question
              {assignment.questionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>
              {assignment.submissionCount} submission
              {assignment.submissionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Created {createdAt ? formatDateOnlyUTC(createdAt) : "Unknown"}
            </span>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
