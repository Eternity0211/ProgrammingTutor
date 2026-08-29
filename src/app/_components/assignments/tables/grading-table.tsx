"use client";

import React from "react";
import {
  GradingTableColumn,
  GradingTableData,
} from "@/lib/types/assignment-tyes";
import { Table, TableBody } from "@/app/_components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { GradingTableFilters } from "./grading-table-filters";
import { GradingTableActions } from "./grading-table-actions";
import { GradingTableHeader } from "./grading-table-header";
import { GradingTableRow } from "./grading-table-row";
import {
  useGradingTableFilters,
  useGradingTableSorting,
  useGradingTableSelection,
} from "./grading-table-hooks";
import { exportGradingTableToCSV } from "@/lib/utils";

interface GradingTableProps {
  data: GradingTableData;
  columns?: GradingTableColumn[];
  assignmentId?: string;
  onScoreChange?: (
    submissionId: string,
    metricId: string,
    newScore: number,
  ) => void;
  onBulkAction?: (action: string, studentIds: string[]) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
}

export const GradingTable: React.FC<GradingTableProps> = ({
  data,
  columns,
  assignmentId,
  onScoreChange,
  onBulkAction,
  onRefresh,
  onExport,
  isRefreshing = false,
  isExporting = false,
}) => {
  // Use custom hooks for state management
  const { sortConfig, sortedStudents, handleSort } = useGradingTableSorting({
    students: data.students,
  });

  const { filters, filteredStudents, updateFilters } = useGradingTableFilters({
    students: sortedStudents,
  });

  const { selectedStudents, handleSelectAll, handleSelectStudent } =
    useGradingTableSelection({
      filteredStudents,
    });

  // Use the provided export handler or fallback to default
  const handleExport =
    onExport ||
    (() => {
      exportGradingTableToCSV(filteredStudents, data);
    });

  // Use passed columns or generate default columns
  const tableColumns = columns || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Grading Table</CardTitle>
          <GradingTableActions
            selectedStudents={selectedStudents}
            filteredData={filteredStudents}
            data={data}
            onBulkAction={onBulkAction}
            onExport={handleExport}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            isExporting={isExporting}
          />
        </div>

        <GradingTableFilters
          search={filters.search}
          status={filters.status}
          scoreRange={filters.scoreRange}
          onSearchChange={(value) =>
            updateFilters((prev) => ({ ...prev, search: value }))
          }
          onStatusChange={(value) =>
            updateFilters((prev) => ({ ...prev, status: value }))
          }
          onScoreRangeChange={(value) =>
            updateFilters((prev) => ({ ...prev, scoreRange: value }))
          }
        />
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <GradingTableHeader
              columns={tableColumns}
              sortConfig={sortConfig}
              selectedCount={selectedStudents.size}
              totalCount={filteredStudents.length}
              onSort={handleSort}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              {filteredStudents.map((student) => (
                <GradingTableRow
                  key={student.id}
                  student={student}
                  columns={tableColumns}
                  metrics={data.metrics}
                  isSelected={selectedStudents.has(student.id)}
                  onSelect={handleSelectStudent}
                  onScoreChange={onScoreChange}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No students found matching the current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
