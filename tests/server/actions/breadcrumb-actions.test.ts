jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    classroom: { findFirst: jest.fn() },
    assignment: { findFirst: jest.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumbLabels } from "@/server/actions/breadcrumb-actions";

const mockedAuth = auth as jest.Mock;
const findClassroom = prisma.classroom.findFirst as jest.Mock;
const findAssignment = prisma.assignment.findFirst as jest.Mock;

describe("getBreadcrumbLabels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not query classroom data for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null);

    await expect(
      getBreadcrumbLabels("/classes/CPP101/assignment-1"),
    ).resolves.toEqual({});
    expect(findClassroom).not.toHaveBeenCalled();
  });

  it("only resolves labels through a classroom accessible to the user", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    findClassroom.mockResolvedValue({
      id: "class-1",
      name: "C++ Fundamentals",
    });
    findAssignment.mockResolvedValue({ title: "Pointers" });

    await expect(
      getBreadcrumbLabels("/classes/CPP101/assignment-1/grading"),
    ).resolves.toEqual({
      "/classes/CPP101": "C++ Fundamentals",
      "/classes/CPP101/assignment-1": "Pointers",
    });
    expect(findClassroom).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          code: "CPP101",
          OR: [
            { facultyId: "user-1" },
            { students: { some: { id: "user-1" } } },
          ],
        }),
      }),
    );
    expect(findAssignment).toHaveBeenCalledWith({
      where: { id: "assignment-1", classroomId: "class-1" },
      select: { title: true },
    });
  });

  it("does not expose assignment labels when classroom access is denied", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    findClassroom.mockResolvedValue(null);

    await expect(
      getBreadcrumbLabels("/classes/CPP101/assignment-1"),
    ).resolves.toEqual({});
    expect(findAssignment).not.toHaveBeenCalled();
  });
});
