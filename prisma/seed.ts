import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import {
  DEMO_DATA_VERSION,
  demoAssignments,
  demoClasses,
  demoConversations,
  demoProfiles,
  demoQuestions,
  demoSubmissions,
  demoUsers,
} from "./demo-data";

const prisma = new PrismaClient();
const DEMO_BASE_DATE = new Date("2026-10-01T00:00:00.000Z");

async function seed() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "1"
  ) {
    throw new Error(
      "Demo seeding is disabled in production. Set ALLOW_DEMO_SEED=1 only for an intentional disposable environment.",
    );
  }

  const password = process.env.DEMO_PASSWORD || "GradeitDemo!2026";
  const passwordHash = await bcrypt.hash(password, 10);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        password: passwordHash,
        onboarded: true,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: passwordHash,
        onboarded: true,
      },
    });
  }

  for (const classroom of demoClasses) {
    const faculty = demoUsers.find(
      (user) => user.email === classroom.facultyEmail,
    );
    if (!faculty) throw new Error(`Missing faculty ${classroom.facultyEmail}`);

    const data = {
      name: classroom.name,
      section: classroom.section,
      facultyName: faculty.name,
      inviteLink: `http://localhost:3000/classes?join=${classroom.code}`,
      faculty: { connect: { email: classroom.facultyEmail } },
    };
    await prisma.classroom.upsert({
      where: { code: classroom.code },
      update: {
        ...data,
        students: {
          set: classroom.studentEmails.map((email) => ({ email })),
        },
      },
      create: {
        id: classroom.id,
        code: classroom.code,
        ...data,
        students: {
          connect: classroom.studentEmails.map((email) => ({ email })),
        },
      },
    });
  }

  for (const assignment of demoAssignments) {
    const dueDate = new Date(DEMO_BASE_DATE);
    dueDate.setUTCDate(dueDate.getUTCDate() + assignment.dueOffsetDays);
    const data = {
      title: assignment.title,
      description: assignment.description,
      DueDate: dueDate,
      classroom: { connect: { code: assignment.classCode } },
    };
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      update: data,
      create: { id: assignment.id, ...data },
    });
  }

  for (const question of demoQuestions) {
    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        title: question.title,
        description: question.description,
        skillTopic: question.skillTopic,
        difficulty: question.difficulty,
      },
      create: {
        id: question.id,
        assignmentId: question.assignmentId,
        classCode: question.classCode,
        title: question.title,
        description: question.description,
        language: "C++",
        skillTopic: question.skillTopic,
        difficulty: question.difficulty,
      },
    });

    for (const [index, [input, expectedOutput]] of question.tests.entries()) {
      const id = `${question.id}-test-${index + 1}`;
      await prisma.testCase.upsert({
        where: { id },
        update: { input, expectedOutput },
        create: {
          id,
          questionId: question.id,
          input,
          expectedOutput,
          hidden: index > 0,
          description: `Demo case ${index + 1}`,
        },
      });
    }
  }

  for (const submission of demoSubmissions) {
    await prisma.submission.upsert({
      where: { id: submission.id },
      update: {
        status: submission.status,
        finalScore: submission.score,
      },
      create: {
        id: submission.id,
        student: { connect: { email: submission.studentEmail } },
        assignment: { connect: { id: submission.assignmentId } },
        status: submission.status,
        finalScore: submission.score,
      },
    });
    await prisma.codeSubmission.upsert({
      where: { id: `${submission.id}-code` },
      update: { code: submission.code, score: submission.score },
      create: {
        id: `${submission.id}-code`,
        submissionId: submission.id,
        questionId: submission.questionId,
        code: submission.code,
        language: "C++",
        score: submission.score,
      },
    });
  }

  for (const conversation of demoConversations) {
    await prisma.chatSession.upsert({
      where: { id: conversation.id },
      update: { title: conversation.title },
      create: {
        id: conversation.id,
        title: conversation.title,
        user: { connect: { email: conversation.userEmail } },
        sessionState: { demoDataVersion: DEMO_DATA_VERSION },
      },
    });
    for (const [index, message] of conversation.messages.entries()) {
      await prisma.chatMessage.upsert({
        where: { id: `${conversation.id}-message-${index + 1}` },
        update: message,
        create: {
          id: `${conversation.id}-message-${index + 1}`,
          sessionId: conversation.id,
          ...message,
          metadata: { demoDataVersion: DEMO_DATA_VERSION },
        },
      });
    }
  }

  for (const profile of demoProfiles) {
    const user = demoUsers.find((item) => item.email === profile.userEmail);
    if (!user) throw new Error(`Missing student ${profile.userEmail}`);
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { weakKnowledgePoints: profile.weakKnowledgePoints },
      create: {
        userId: user.id,
        weakKnowledgePoints: profile.weakKnowledgePoints,
        codeSubmissionRecords: [],
        emotionStats: [],
      },
    });
  }

  console.log(
    `Seeded ${DEMO_DATA_VERSION}: ${demoUsers.length} users, ${demoClasses.length} classes, ${demoAssignments.length} assignments, ${demoQuestions.length} questions, and ${demoConversations.length} conversations.`,
  );
  console.log(`Demo password: ${password}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
