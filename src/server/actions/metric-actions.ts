"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/config/route";

export const getUserMetrics = async () => {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const metrics = await prisma.evaluationMetric.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { status: "success", metrics };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return { status: "error", message: "Failed to fetch metrics" };
  }
};

export const createMetric = async (data: {
  name: string;
  description?: string;
}) => {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const metric = await prisma.evaluationMetric.create({
      data: {
        name: data.name,
        description: data.description,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    revalidatePath(ROUTES.CLASSES);
    return { status: "success", metric };
  } catch (error) {
    console.error("Error creating metric:", error);
    return { status: "error", message: "Failed to create metric" };
  }
};
