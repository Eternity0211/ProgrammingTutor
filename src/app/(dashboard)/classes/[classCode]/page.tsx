import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { AssignmentList } from "@/app/_components/assignments/assignment-list";
import { ClassHeader } from "@/app/_components/classes/class-header";
import { PeopleTab } from "@/app/_components/classes/people-tab";
import { ClassSettingsTab } from "@/app/_components/classes/settings-tab";
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
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { classCode } = await params;
  const { tab } = await searchParams;
  const { classroom } = await getClassbyCode(classCode);
  const { role } = await getUserRole();
  const { assignments } = await getAssignments(classroom?.id || "");
  const { teachers, students } = await getMembersByClassId(classCode);

  if (!classroom) {
    return notFound();
  }

  const validTabs = ["assignments", "people", "settings"];
  const activeTab = tab && validTabs.includes(tab) ? tab : "assignments";

  return (
    <div className="flex flex-col">
      <ClassHeader classData={classroom} />
      <div className="mx-auto max-w-6xl w-full px-6 pt-6">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <AssignmentList
              classCode={classCode}
              role={role || "STUDENT"}
              assignments={assignments || []}
            />
          </TabsContent>

          <TabsContent value="people">
            <PeopleTab
              classCode={classCode}
              teachers={teachers || []}
              students={students || []}
              role={role || "STUDENT"}
            />
          </TabsContent>

          <TabsContent value="settings">
            <ClassSettingsTab classData={classroom} role={role} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
