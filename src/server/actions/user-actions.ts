"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// 通用用户查询函数（复用逻辑）
const getCurrentUser = async () => {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error("No user found");
  }

  return user;
};

// 更新用户名
export const updateUserName = async (name: string) => {
  try {
    const user = await getCurrentUser();

    if (user.name === name) {
      return { status: "success", message: "No changes detected" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return { status: "success", success: true };
  } catch (error) {
    console.error("Error updating name:", error);
    return { status: "failed", success: false };
  }
};

// 更新用户入职状态
export const updateOnboardingStatus = async (onboarded: boolean) => {
  try {
    const user = await getCurrentUser();

    if (user.onboarded === onboarded) {
      return { status: "success", message: "No changes detected" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { onboarded },
    });
    return { status: "success" };
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return { status: "failed" };
  }
};

// 更新用户角色
export const updateUserRole = async (role: Role) => {
  try {
    const user = await getCurrentUser();

    if (user.role === role) {
      return { status: "success", message: "No changes detected" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { role },
    });
    return { status: "success" };
  } catch (error) {
    console.error("Error updating role:", error);
    return { status: "failed" };
  }
};

// 获取用户角色
export const getUserRole = async () => {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user) {
      throw new Error("No user found");
    }
    return { role: user.role, status: "success" };
  } catch (error) {
    console.error("Error fetching user role:", error);
    return { status: "failed" };
  }
};
