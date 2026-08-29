"use client";

import { useState, useMemo } from "react";
import { GradingTableStudent } from "@/lib/types/assignment-tyes";

interface UseGradingTableFiltersProps {
  students: GradingTableStudent[];
}

interface UseGradingTableSortingProps {
  students: GradingTableStudent[];
}

interface UseGradingTableSelectionProps {
  filteredStudents: GradingTableStudent[];
}

// Filters hook
export function useGradingTableFilters({
  students,
}: UseGradingTableFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    scoreRange: "all",
  });

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search filter
      if (
        filters.search &&
        !student.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !student.email.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filters.status !== "all") {
        const hasMatchingStatus = student.status === filters.status;
        if (!hasMatchingStatus) return false;
      }

      // Score range filter
      if (filters.scoreRange !== "all") {
        const [min, max] = filters.scoreRange.split("-").map(Number);
        if (
          student.overallSubmission.totalScore < min ||
          student.overallSubmission.totalScore > max
        )
          return false;
      }

      return true;
    });
  }, [students, filters]);

  return {
    filters,
    filteredStudents,
    updateFilters: setFilters,
  };
}

// Sorting hook
export function useGradingTableSorting({
  students,
}: UseGradingTableSortingProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const sortedStudents = useMemo(() => {
    if (!sortConfig) return students;

    return [...students].sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortConfig.key === "student") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortConfig.key === "overallScore") {
        aValue = a.overallScore;
        bValue = b.overallScore;
      } else if (sortConfig.key === "status") {
        aValue = a.status;
        bValue = b.status;
      } else if (sortConfig.key.startsWith("metric_")) {
        const metricId = sortConfig.key.replace("metric_", "");
        aValue =
          a.overallSubmission?.metricScores.find((m) => m.metricId === metricId)
            ?.score || 0;
        bValue =
          b.overallSubmission?.metricScores.find((m) => m.metricId === metricId)
            ?.score || 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  return {
    sortConfig,
    sortedStudents,
    handleSort,
  };
}

// Selection hook
export function useGradingTableSelection({
  filteredStudents,
}: UseGradingTableSelectionProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  return {
    selectedStudents,
    handleSelectAll,
    handleSelectStudent,
  };
}
