"use client";

import { useState } from "react";
import { AssignmentById } from "@/lib/types/assignment-tyes";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  deleteAssignment,
  updateAssignmentDueDate,
} from "@/server/actions/assignment-actions";
import { ROUTES } from "@/config/route";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";

interface AssignmentHeaderProps {
  assignment: AssignmentById;
  classCode: string;
}

const formatDateForInput = (date: Date | string | null) => {
  if (!date) {
    return "";
  }

  const localDate = new Date(date);
  const timezoneOffset = localDate.getTimezoneOffset() * 60000;
  return new Date(localDate.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
};

const formatDueDateStable = (date: Date | string | null) => {
  if (!date) {
    return "No due date";
  }

  const d = new Date(date);
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const hours24 = d.getUTCHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  const meridiem = hours24 >= 12 ? "PM" : "AM";

  return `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${hours12}:${minutes} ${meridiem} UTC`;
};

export function AssignmentHeader({
  assignment,
  classCode,
}: AssignmentHeaderProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<string>(() =>
    formatDateForInput(assignment.dueDate),
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDueDate = formatDueDateStable(assignment.dueDate);

  const handleUpdateDueDate = async () => {
    try {
      setLoading(true);
      const result = await updateAssignmentDueDate({
        assignmentId: assignment.id,
        classCode,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      if (result.status === "success") {
        toast.success("截止日期更新成功");
        setIsDialogOpen(false);
        router.refresh();
        return;
      }

      toast.warning(result.message || "更新截止日期失败");
    } catch (error) {
      console.error("Failed to update due date:", error);
      toast.error("更新截止日期时发生错误");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteAssignment({
        assignmentId: assignment.id,
        classCode,
      });

      if (result.status === "success") {
        toast.success("作业已删除");
        setIsDeleteDialogOpen(false);
        router.push(ROUTES.CLASS_DETAILS(classCode));
        return;
      }

      toast.warning(result.message || "删除作业失败");
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      toast.error("删除作业时发生错误");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-foreground">
            {assignment.title}
          </h1>
          <p className="mt-1 text-muted-foreground">Due {formattedDueDate}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (open) {
                setDueDate(formatDateForInput(assignment.dueDate));
              }
            }}
          >
            <Button
              type="button"
              variant="outline"
              className="border-border"
              onClick={() => setIsDialogOpen(true)}
            >
              <CalendarClock className="h-4 w-4" />
              Change DDL
            </Button>

            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>修改作业截止时间</DialogTitle>
                <DialogDescription>
                  可设置新的截至日期，或清空后保存以移除截止时间。
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2 py-2">
                <Label htmlFor="assignment-due-date">截止日期</Label>
                <Input
                  id="assignment-due-date"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-border"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-border"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleUpdateDueDate}
                  className="bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50"
                >
                  {loading ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => setIsDeleteDialogOpen(open)}
          >
            <Button
              type="button"
              variant="destructive"
              className="border-border"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete Assignment
            </Button>

            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>删除作业</DialogTitle>
                <DialogDescription>
                  所有学生提交、分数等数据都会被删掉，此操作不可撤销。
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="border-border"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAssignment}
                  disabled={isDeleting}
                  className="text-white"
                >
                  {isDeleting ? "删除中..." : "确认删除"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
