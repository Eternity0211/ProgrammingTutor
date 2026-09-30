"use server";

import { auth } from "@/lib/auth";
import { getBreadcrumbSegments } from "@/lib/breadcrumbs";
import { prisma } from "@/lib/prisma";

export async function getBreadcrumbLabels(
  pathname: string,
): Promise<Record<string, string>> {
  const segments = getBreadcrumbSegments(pathname);
  if (segments[0] !== "classes" || !segments[1]) return {};

  const classCode = segments[1];
  try {
    const session = await auth();
    if (!session?.user?.id) return {};

    const classroom = await prisma.classroom.findFirst({
      where: {
        code: classCode,
        OR: [
          { facultyId: session.user.id },
          { students: { some: { id: session.user.id } } },
        ],
      },
      select: { id: true, name: true },
    });
    if (!classroom) return {};

    const classHref = `/classes/${encodeURIComponent(classCode)}`;
    const labels: Record<string, string> = {
      [classHref]: classroom.name,
    };

    const assignmentId = segments[2];
    if (assignmentId && assignmentId !== "create") {
      const assignment = await prisma.assignment.findFirst({
        where: { id: assignmentId, classroomId: classroom.id },
        select: { title: true },
      });
      if (assignment) {
        labels[`${classHref}/${encodeURIComponent(assignmentId)}`] =
          assignment.title;
      }
    }

    return labels;
  } catch (error) {
    console.error("Failed to resolve breadcrumb labels:", error);
    return {};
  }
}
