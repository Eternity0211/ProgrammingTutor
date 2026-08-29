"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getLoginMethod(userId: string) {
  const res = await prisma.account.findFirst({
    where: {
      userId: userId,
    },
  });

  if (!res) return null;
  return res.provider;
}

export async function isUserOnboarded(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
  return user?.onboarded ?? false;
}

export async function isCodeUnique(code: string) {
  const codeExist = await prisma.classroom.findUnique({
    where: {
      code: code,
    },
  });
  return !codeExist;
}

export async function getClassIdFromCode(code: string) {
  const classroom = await prisma.classroom.findUnique({
    where: {
      code: code,
    },
  });
  return classroom?.id;
}

export async function getClassNameFromCode(code: string) {
  const classroom = await prisma.classroom.findUnique({
    where: {
      code: code,
    },
  });
  return classroom?.name;
}

export async function getAssigmentTitleFromId(id: string) {
  const assignment = await prisma.assignment.findUnique({
    where: {
      id: id,
    },
  });
  return assignment?.title;
}

export async function setStudentCookie(studentId: string) {
  (await cookies()).set("student", studentId, {
    httpOnly: true, // Only accessible by the server
    path: "/", // Available across the app
    sameSite: "strict",
  });
}
