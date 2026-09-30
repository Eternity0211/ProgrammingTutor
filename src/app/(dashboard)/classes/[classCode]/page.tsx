import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssignmentList } from "@/app/_components/assignments/assignment-list";
import { ClassHeader } from "@/app/_components/classes/class-header";
import { PeopleTab } from "@/app/_components/classes/people-tab";
import { ClassSettingsTab } from "@/app/_components/classes/settings-tab";
import { ClassTabs } from "@/app/_components/classes/class-tabs";
import {
  getClassbyCode,
  getMembersByClassId,
} from "@/server/actions/class-actions";
import { getUserRole } from "@/server/actions/user-actions";
import { getAssignments } from "@/server/actions/assignment-actions";

export const metadata: Metadata = {
  title: "Class Details | gradeIT",
  description: "View and manage assignments for this class",
};

export default async function ClassPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const { classroom } = await getClassbyCode(classCode);
  const { role } = await getUserRole();
  const { assignments } = await getAssignments(classroom?.id || "");
  const { teachers, students } = await getMembersByClassId(classCode);

  if (!classroom) {
    return notFound();
  }

  return (
    <div className="flex flex-col">
      <ClassHeader classData={classroom} />
      <div className="mx-auto max-w-6xl w-full px-6 pt-6">
        <ClassTabs
          assignments={
            <AssignmentList
              classCode={classCode}
              role={role || "STUDENT"}
              assignments={assignments || []}
            />
          }
          people={
            <PeopleTab
              classCode={classCode}
              teachers={teachers || []}
              students={students || []}
              role={role || "STUDENT"}
            />
          }
          settings={<ClassSettingsTab classData={classroom} role={role} />}
        />
      </div>
    </div>
  );
}
