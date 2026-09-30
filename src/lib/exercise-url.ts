import { isTrustedLeetCodeExerciseUrl } from "@/lib/leetcode";

const CLASSROOM_EXERCISE_PATH =
  /^\/classes\/[^/?#]+\/[^/?#]+(?:\?question=[^&#]+)?$/;

export function isTrustedClassroomExerciseUrl(
  value: string | null | undefined,
): value is string {
  return Boolean(value && CLASSROOM_EXERCISE_PATH.test(value));
}

export function getTrustedExerciseDestination(
  value: string | null | undefined,
): { kind: "classroom" | "leetcode"; url: string } | null {
  if (isTrustedClassroomExerciseUrl(value)) {
    return { kind: "classroom", url: value };
  }
  if (isTrustedLeetCodeExerciseUrl(value)) {
    return { kind: "leetcode", url: value };
  }
  return null;
}
