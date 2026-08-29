"use client";

import { Users, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Progress } from "@/app/_components/ui/progress";

interface FacultyStatsCardsProps {
  totalStudents: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

interface StatCardProps {
  title: string;
  description: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({
  title,
  description,
  value,
  total,
  icon,
  className,
}: StatCardProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-medium text-foreground">{value}</p>
        <Progress value={percentage} className="mt-2" />
      </CardContent>
    </Card>
  );
}

export function FacultyStatsCards({
  totalStudents,
  completedCount,
  inProgressCount,
  notStartedCount,
}: FacultyStatsCardsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <StatCard
        title="Total Students"
        description="Number of enrolled students"
        value={totalStudents}
        total={totalStudents}
        icon={<Users className="h-5 w-5 text-muted-foreground" />}
      />

      <StatCard
        title="Completed"
        description="Students who completed all questions"
        value={completedCount}
        total={totalStudents}
        icon={<CheckCircle2 className="h-5 w-5 text-status-passed" />}
      />

      <StatCard
        title="In Progress"
        description="Students currently working"
        value={inProgressCount}
        total={totalStudents}
        icon={<Clock className="h-5 w-5 text-status-pending-foreground" />}
      />

      <StatCard
        title="Not Started"
        description="Students yet to begin"
        value={notStartedCount}
        total={totalStudents}
        icon={<XCircle className="h-5 w-5 text-destructive" />}
      />
    </div>
  );
}
