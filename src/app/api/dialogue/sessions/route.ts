import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(sessions);
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await prisma.chatSession.create({
    data: { userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(session);
}
