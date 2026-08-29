"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { TableHead, TableHeader, TableRow } from "@/app/_components/ui/table";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { GradingTableColumn } from "@/lib/types/assignment-tyes";

interface GradingTableHeaderProps {
  columns: GradingTableColumn[];
  sortConfig: {
    key: string;
    direction: "asc" | "desc";
  } | null;
  selectedCount: number;
  totalCount: number;
  onSort: (key: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export function GradingTableHeader({
  columns,
  sortConfig,
  selectedCount,
  totalCount,
  onSort,
  onSelectAll,
}: GradingTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.key}
            style={{ width: column.width }}
            className={column.sortable ? "cursor-pointer hover:bg-muted" : ""}
            onClick={() => column.sortable && onSort(column.key)}
          >
            {column.key === "select" ? (
              <Checkbox
                checked={selectedCount === totalCount && totalCount > 0}
                onCheckedChange={onSelectAll}
              />
            ) : (
              <div className="flex items-center gap-1">
                {column.label}
                {column.sortable &&
                  sortConfig?.key === column.key &&
                  (sortConfig.direction === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
