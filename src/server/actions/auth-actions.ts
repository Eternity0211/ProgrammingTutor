"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Role } from "@prisma/client";

export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return !!user;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: Role,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return { success: false, error: "该邮箱已被注册" };
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        onboarded: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Registration failed:", error);
    return { success: false, error: "注册失败，请稍后重试" };
  }
}
