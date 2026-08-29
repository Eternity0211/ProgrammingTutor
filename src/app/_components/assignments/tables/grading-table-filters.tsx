"use client";

import { Search } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";

interface GradingTableFiltersProps {
  search: string;
  status: string;
  scoreRange: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onScoreRangeChange: (value: string) => void;
}

export function GradingTableFilters({
  search,
  status,
  scoreRange,
  onSearchChange,
  onStatusChange,
  onScoreRangeChange,
}: GradingTableFiltersProps) {
  return (
    <div className="flex items-center gap-4 mt-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="NOT_STARTED">Not Started</SelectItem>
          <SelectItem value="LATE_SUBMISSION">Late Submission</SelectItem>
          <SelectItem value="PARTIAL">Partial</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={scoreRange} onValueChange={onScoreRangeChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Filter by score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Scores</SelectItem>
          <SelectItem value="90-100">90-100%</SelectItem>
          <SelectItem value="80-89">80-89%</SelectItem>
          <SelectItem value="70-79">70-79%</SelectItem>
          <SelectItem value="60-69">60-69%</SelectItem>
          <SelectItem value="0-59">0-59%</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
