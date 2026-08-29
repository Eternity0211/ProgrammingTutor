import type { Metadata } from "next";
import { ClassGrid } from "@/app/_components/classes/class-grid";
import { PageHeader } from "@/app/_components/page-header";
import { getUserClasses } from "@/server/actions/class-actions";
import { auth } from "@/lib/auth";

import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { ROUTES } from "@/config/route";
import { UserCircle } from "lucide-react";
import { Role } from "@prisma/client";
import AuthWrapper from "@/app/_components/auth/auth-wrapper";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Classes | gradeIT",
  description: "Manage and access your coding classes",
};

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AuthWrapper />
      </div>
    );
  }
  const { classes, role } = await getUserClasses();
  return (
    <div className="flex flex-col gap-8 p-6 py-0">
      <div className="flex justify-between items-center">
        <PageHeader
          heading="Classes"
          text="Access and manage your coding classes."
        />
        {role === "STUDENT" && (
          <Link href={ROUTES.PROFILE}>
            <Button variant="outline" className="flex gap-2">
              <UserCircle className="w-4 h-4" />
              个人中心
            </Button>
          </Link>
        )}
      </div>
      <ClassGrid classes={classes || []} role={(role as Role) || "STUDENT"} />
    </div>
  );
}
