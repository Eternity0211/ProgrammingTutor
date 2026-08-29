"use client";

import { Search, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import Link from "next/link";

interface FacultyActionsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  classCode: string;
  assignmentId: string;
}

export function FacultyActionsToolbar({
  searchQuery,
  onSearchChange,
  classCode,
  assignmentId,
}: FacultyActionsToolbarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          className="pl-9 border-border"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1.5 border-border">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>All Students</DropdownMenuItem>
          <DropdownMenuItem>Completed</DropdownMenuItem>
          <DropdownMenuItem>In Progress</DropdownMenuItem>
          <DropdownMenuItem>Not Started</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href={`/classes/${classCode}/${assignmentId}/grading`}>
        <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <BarChart3 className="h-4 w-4" />
          Grading Table
        </Button>
      </Link>
    </div>
  );
}
