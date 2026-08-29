"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  GradingTableData,
  GradingTableStudent,
} from "@/lib/types/assignment-tyes";

interface GradingTableActionsProps {
  selectedStudents: Set<string>;
  filteredData: GradingTableStudent[];
  data: GradingTableData;
  onBulkAction?: (action: string, studentIds: string[]) => void;
  onExport: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
}

export function GradingTableActions({
  selectedStudents,
  filteredData,
  data,
  onBulkAction,
  onExport,
  onRefresh,
  isRefreshing = false,
  isExporting = false,
}: GradingTableActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        disabled={filteredData.length === 0 || isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Exporting..." : "Export CSV"}
      </Button>
      {selectedStudents.size > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions ({selectedStudents.size})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() =>
                onBulkAction?.("export", Array.from(selectedStudents))
              }
            >
              Export Selected
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onBulkAction?.("comment", Array.from(selectedStudents))
              }
            >
              Add Comment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
