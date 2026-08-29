"use client";

import { useState } from "react";
import { Search, UserPlus, Mail, Trash2Icon } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/_components/ui/avatar";
import { Members } from "@/lib/types/class-types";
import InvitePeopleDialog from "./Invite-dialog";
import { Role } from "@prisma/client";
import { removeStudentFromClass } from "@/server/actions/class-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PeopleTabProps {
  classCode: string;
  teachers: Members[];
  students: Members[];
  role: Role;
}

export function PeopleTab({
  classCode,
  teachers,
  students,
  role,
}: PeopleTabProps) {
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRemoveFromClass = async (studentId: string) => {
    const toastId = toast.loading("Removing student...");
    try {
      const res = await removeStudentFromClass(classCode, studentId);
      if (res.status === "success") {
        toast.success("Student removed successfully", { id: toastId });
        router.refresh();
      } else {
        toast.error("Failed to remove student", { id: toastId });
      }
    } catch (e) {
      toast.error("Error occurred", { id: toastId });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-1">
          <UserPlus className="h-4 w-4" /> Invite People
        </Button>
      </div>

      {/* TEACHERS */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-medium">Teachers</h3>
        </div>
        <div className="divide-y divide-border">
          {filteredTeachers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No teachers found</div>
          ) : (
            filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={teacher.image || ""} />
                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{teacher.name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* STUDENTS */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-medium">Students</h3>
          <p className="text-sm text-muted-foreground">{students.length} students</p>
        </div>
        <div className="divide-y divide-border">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No students found</div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={student.image || ""} />
                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* MAIL */}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Mail className="h-4 w-4" />
                  </Button>

                  {role === "FACULTY" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-red-600 hover:bg-red-100/20 hover:text-red-500 dark:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      onClick={() => handleRemoveFromClass(student.id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <InvitePeopleDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        classCode={classCode}
      />
    </div>
  );
}