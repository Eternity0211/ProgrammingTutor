import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { messages: { orderBy: { timestamp: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(_req: Request, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chatSession.delete({
    where: { id: sessionId },
  });

  return NextResponse.json({ success: true });
}
