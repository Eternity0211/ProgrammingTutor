import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const codeDraftDelegate = (prisma as any).codeDraft;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignmentId = req.nextUrl.searchParams.get("assignmentId");
    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 },
      );
    }

    const drafts = await codeDraftDelegate.findMany({
      where: {
        studentId: session.user.id,
        assignmentId,
      },
      select: {
        questionId: true,
        code: true,
        language: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ drafts });
  } catch (error: any) {
    console.error("Error loading drafts:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const assignmentId = String(body?.assignmentId || "").trim();
    const questionId = String(body?.questionId || "").trim();
    const code = String(body?.code ?? "");
    const language = String(body?.language || "").trim();

    if (!assignmentId || !questionId || !language) {
      return NextResponse.json(
        { error: "assignmentId, questionId and language are required" },
        { status: 400 },
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, assignmentId: true },
    });

    if (!question || question.assignmentId !== assignmentId) {
      return NextResponse.json(
        { error: "Question does not belong to assignment" },
        { status: 400 },
      );
    }

    await codeDraftDelegate.upsert({
      where: {
        studentId_assignmentId_questionId: {
          studentId: session.user.id,
          assignmentId,
          questionId,
        },
      },
      create: {
        studentId: session.user.id,
        assignmentId,
        questionId,
        code,
        language,
      },
      update: {
        code,
        language,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
