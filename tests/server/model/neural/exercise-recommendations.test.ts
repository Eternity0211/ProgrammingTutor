jest.mock("@/lib/prisma", () => ({
  prisma: {
    question: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getClassroomExerciseRecommendations,
  inferPracticeTopics,
  mergeExerciseRecommendations,
} from "@/server/model/neural/exercise-recommendations";
import type { RecommendedExercise } from "@/server/model/neural/navigationAgent";

describe("classroom exercise recommendations", () => {
  it("maps weakness descriptions to normalized practice topics", () => {
    expect(inferPracticeTopics(["指针引用错误", "递归边界处理不完整"])).toEqual(
      expect.arrayContaining(["pointer", "memory-management", "recursion"]),
    );
  });

  it("prioritizes classroom exercises while retaining an external option", () => {
    const classroom: RecommendedExercise[] = [
      {
        id: "classroom:q1",
        title: "班级题一",
        difficulty: "初级",
        purpose: "巩固指针",
        url: "/classes/CODE/a1?question=q1",
        source: "classroom",
      },
      {
        id: "classroom:q2",
        title: "班级题二",
        difficulty: "中级",
        purpose: "巩固递归",
        url: "/classes/CODE/a2?question=q2",
        source: "classroom",
      },
    ];
    const external: RecommendedExercise[] = [
      {
        id: "leetcode:two-sum",
        title: "Two Sum",
        difficulty: "初级",
        purpose: "补充训练",
        url: "https://leetcode.cn/problems/two-sum/",
        source: "leetcode",
      },
    ];

    expect(mergeExerciseRecommendations(classroom, external, 3)).toEqual([
      ...classroom,
      ...external,
    ]);
  });

  it("only queries assignments available to the current student", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([
      {
        id: "q1",
        title: "指针基础",
        difficulty: "easy",
        assignmentId: "a1",
        classCode: null,
        skillTopic: "pointer",
        assignment: { classroom: { code: "CPP101" } },
      },
    ]);

    await expect(
      getClassroomExerciseRecommendations("student-1", ["指针错误"]),
    ).resolves.toEqual([
      expect.objectContaining({
        source: "classroom",
        url: "/classes/CPP101/a1?question=q1",
      }),
    ]);
    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: {
            classroom: { students: { some: { id: "student-1" } } },
          },
        }),
      }),
    );
  });
});
