import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/config/route";
import type { RecommendedExercise } from "./navigationAgent";

const TOPIC_KEYWORDS: Array<[RegExp, string[]]> = [
  [/指针|pointer|引用|reference/i, ["pointer", "memory-management"]],
  [/内存|memory|leak|释放|free/i, ["memory-management", "pointer"]],
  [/栈|stack/i, ["stack"]],
  [/队列|queue/i, ["queue"]],
  [/递归|recursion/i, ["recursion"]],
  [/二分|binary|搜索|search/i, ["binary-search"]],
  [/排序|sort|复杂度|complexity/i, ["sorting"]],
  [/边界|control|分支/i, ["control-flow"]],
];

const DIFFICULTY_LABELS: Record<string, RecommendedExercise["difficulty"]> = {
  beginner: "入门",
  easy: "初级",
  intermediate: "中级",
  advanced: "高级",
};

export function inferPracticeTopics(weaknesses: string[]): string[] {
  const topics = new Set<string>();
  for (const weakness of weaknesses) {
    for (const [pattern, values] of TOPIC_KEYWORDS) {
      if (pattern.test(weakness)) values.forEach((value) => topics.add(value));
    }
  }
  return [...topics];
}

export function mergeExerciseRecommendations(
  classroom: RecommendedExercise[],
  external: RecommendedExercise[],
  limit = 3,
): RecommendedExercise[] {
  const internalLimit = external.length > 0 ? Math.max(0, limit - 1) : limit;
  const combined = [...classroom.slice(0, internalLimit), ...external];
  return Array.from(
    new Map(
      combined.map((item) => [`${item.source}:${item.id}`, item]),
    ).values(),
  ).slice(0, limit);
}

export async function getClassroomExerciseRecommendations(
  studentId: string,
  weaknesses: string[],
  limit = 2,
): Promise<RecommendedExercise[]> {
  const topics = inferPracticeTopics(weaknesses);
  if (topics.length === 0 || limit <= 0) return [];

  const questions = await prisma.question.findMany({
    where: {
      skillTopic: { in: topics },
      assignment: {
        classroom: { students: { some: { id: studentId } } },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      difficulty: true,
      assignmentId: true,
      classCode: true,
      skillTopic: true,
      assignment: { select: { classroom: { select: { code: true } } } },
    },
  });

  return questions.map((question) => {
    const classCode = question.classCode || question.assignment.classroom.code;
    return {
      id: `classroom:${question.id}`,
      title: question.title,
      difficulty:
        DIFFICULTY_LABELS[question.difficulty?.toLowerCase() || ""] || "初级",
      purpose: `在班级作业中巩固 ${question.skillTopic || "当前薄弱知识点"}`,
      url: `${ROUTES.ASSIGNMENT_DETAILS(classCode, question.assignmentId)}?question=${encodeURIComponent(question.id)}`,
      source: "classroom",
    };
  });
}
