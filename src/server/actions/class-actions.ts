"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classCreation, UserClassroom } from "@/lib/types/class-types";
import { generateClassroomCode } from "@/lib/utils";
import { isCodeUnique } from "./utility-actions";
import { getUserRole } from "./user-actions";
import { ROUTES } from "@/config/route";

export const createClass = async (data: classCreation) => {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  try {
    const faculty = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        role: "FACULTY",
      },
    });

    if (!faculty) {
      throw new Error("Unauthorized");
    }

    let code;
    do {
      code = generateClassroomCode();
    } while (!(await isCodeUnique(code)));

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}${ROUTES.INVITE(code)}`;
    const newclass = await prisma.classroom.create({
      data: {
        facultyId: faculty.id,
        name: data.name,
        section: data.section,
        code,
        inviteLink,
        facultyName: faculty.name,
      },
    });

    return {
      class: newclass,
      status: "success",
    };
  } catch (error) {
    console.error("Error creating class:", error);
    return { status: "failed" };
  }
};

export const getUserClasses = async () => {
  const session = await auth();

  if (!session?.user) {
    console.error("Unauthorized access attempt to get user classes");
    return { status: "Unauthorized" };
  }

  try {
    const { role } = await getUserRole();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        classrooms: role === "FACULTY" && {
          select: {
            id: true,
            name: true,
            section: true,
            code: true,
            inviteLink: true,
            facultyName: true,
          },
        },
        enrolledClasses: role === "STUDENT" && {
          select: {
            id: true,
            name: true,
            section: true,
            code: true,
            inviteLink: true,
            facultyName: true,
          },
        },
      },
    });
    if (!user) {
      throw new Error("User not found");
    }

    const classes: UserClassroom[] = (
      role === "FACULTY" ? user.classrooms : user.enrolledClasses || []
    ).map((classroom) => ({
      ...classroom,
    }));

    return { status: "success", classes, role };
  } catch (error) {
    console.error("Error fetching classes:", error);
    return { status: "failed" };
  }
};

export const getClassbyCode = async (code: string) => {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const classroom = await prisma.classroom.findFirst({
      where: {
        code,
        OR: [
          {
            students: {
              some: {
                id: session.user.id,
              },
            },
          },
          {
            facultyId: session.user.id,
          },
        ],
      },
    });

    return { status: "success", classroom };
  } catch (error) {
    console.error("Error fetching class by code:", error);
    return { status: "failed" };
  }
};

export const joinClassUsingCode = async (code: string) => {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  try {
    const student = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        role: "STUDENT",
      },
      include: {
        enrolledClasses: true,
      },
    });

    if (!student) {
      throw new Error("Unauthorized");
    }

    const classroom = await prisma.classroom.findUnique({
      where: { code },
    });

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const isAlreadyEnrolled = student.enrolledClasses.some(
      (c) => c.id === classroom.id,
    );

    if (isAlreadyEnrolled) {
      return { status: "success", message: "Already enrolled in this class" };
    }

    await prisma.user.update({
      where: { id: student.id },
      data: {
        enrolledClasses: {
          connect: { id: classroom.id },
        },
      },
    });

    return { status: "success", message: "Joined class successfully" };
  } catch (error) {
    console.error("Error while joining class:", error);
    return { status: "failed" };
  }
};

export const getMembersByClassId = async (code: string) => {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  try {
    const classroom = await prisma.classroom.findFirst({
      where: {
        code,
        OR: [
          {
            students: {
              some: {
                id: session.user.id,
              },
            },
          },
          {
            facultyId: session.user.id,
          },
        ],
      },
      include: {
        students: true,
        faculty: true,
      },
    });

    if (!classroom) {
      return {
        status: "failed",
        message: "No class with the given code found",
      };
    }

    const teachers = [
      {
        id: classroom.faculty.id,
        name: classroom.faculty.name,
        email: classroom.faculty.email || "",
        role: classroom.faculty.role,
        image: classroom.faculty.image || "",
      },
    ];

    const students = classroom?.students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email || "",
      role: student.role,
      image: student.image || "",
    }));

    return {
      status: "success",
      teachers,
      students,
    };
  } catch (error) {
    console.error("Error while joining class:", error);
    return { status: "failed" };
  }
};

export const deleteClass = async (classCode: string) => {
  const session = await auth();

  if (!session?.user && session?.user.role !== "FACULTY") {
    throw new Error("Unauthorized");
  }

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { code: classCode },
    });

    if (!classroom) {
      return { status: "failed", message: "Classroom not found" };
    }

    if (classroom.facultyId !== session.user.id) {
      return { status: "failed", message: "Unauthorized to delete this class" };
    }

    await prisma.classroom.delete({
      where: { code: classCode },
    });
    return { status: "success", message: "Classroom deleted successfully" };
  } catch (error) {
    console.error("Error deleting class:", error);
    return { status: "failed" };
  }
};

export const removeStudentFromClass = async (
  classCode: string,
  studentId: string,
) => {
  const session = await auth();

  if (!session?.user || session?.user.role !== "FACULTY") {
    throw new Error("Unauthorized");
  }

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { code: classCode },
    });

    if (!classroom) {
      return { status: "failed", message: "Classroom not found" };
    }

    if (classroom.facultyId !== session.user.id) {
      return {
        status: "failed",
        message: "Unauthorized to remove student from this class",
      };
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: studentId },
          data: {
            enrolledClasses: {
              disconnect: { id: classroom.id },
            },
          },
        });

        // Delete all submissions for this student in this classroom
        await tx.submission.deleteMany({
          where: {
            studentId: studentId,
            assignment: {
              classroomId: classroom.id,
            },
          },
        });
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    return {
      status: "success",
      message: "Student removed from class successfully",
    };
  } catch (error) {
    console.error("Error removing student from class:", error);
    return { status: "failed" };
  }
};
