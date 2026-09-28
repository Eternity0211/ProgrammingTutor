export const TRUSTED_LEARNING_RESOURCES = [
  "cppreference C++ reference: https://en.cppreference.com/w/cpp",
  "C++ Core Guidelines: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
  "LearnCpp tutorials: https://www.learncpp.com/",
] as const;

const evidenceTagPattern =
  /\[(CODE(?::L\d+(?:-L\d+)?)?|TEST|SYM:[^\]]+|REVIEW(?::(?:NO_)?CONFIRMED_ISSUES)?|PROFILE|DIALOGUE|HISTORY|GRAPH)\]/g;

export function extractEvidenceTags(value: string): string[] {
  return [...value.matchAll(evidenceTagPattern)].map((match) => match[1]);
}

export function hasAllowedEvidenceTag(
  value: string,
  allowedTags: ReadonlySet<string>,
): boolean {
  return extractEvidenceTags(value).some((tag) =>
    isAllowedEvidenceTag(tag, allowedTags),
  );
}

function isAllowedEvidenceTag(
  tag: string,
  allowedTags: ReadonlySet<string>,
): boolean {
  const codeLines = tag.match(/^CODE:L(\d+)(?:-L(\d+))?$/);
  if (!codeLines) return allowedTags.has(tag);
  const start = Number(codeLines[1]);
  const end = Number(codeLines[2] ?? codeLines[1]);
  if (end < start) return false;
  for (let line = start; line <= end; line += 1) {
    if (!allowedTags.has(`CODE:L${line}`)) return false;
  }
  return true;
}

export function validateGroundedStatements(
  statements: string[],
  allowedTags: ReadonlySet<string>,
): string[] {
  return statements.flatMap((statement, index) => {
    const tags = extractEvidenceTags(statement);
    if (tags.length === 0) {
      return [`statement ${index + 1} has no evidence tag`];
    }
    const invalidTags = tags.filter(
      (tag) => !isAllowedEvidenceTag(tag, allowedTags),
    );
    return invalidTags.map((tag) =>
      `statement ${index + 1} references unavailable evidence ${tag}`,
    );
  });
}

type ExerciseCatalogItem = {
  id: string;
  title: string;
  difficulty: "入门" | "初级" | "中级" | "高级";
  url: string;
};

type NavigationOutput = {
  learning_navigation: {
    weaknesses: string[];
    learning_path: Array<{
      step: number;
      topic: string;
      duration: string;
      resources: string[];
    }>;
    recommended_exercises: Array<{
      id: string;
      title: string;
      difficulty: "入门" | "初级" | "中级" | "高级";
      purpose: string;
      url: string;
    }>;
  };
};

export function groundNavigationOutput(
  result: NavigationOutput,
  allowedTags: ReadonlySet<string>,
  exerciseCatalog: ExerciseCatalogItem[],
): NavigationOutput {
  const catalogById = new Map(exerciseCatalog.map((item) => [item.id, item]));
  const trustedResources = new Set<string>(TRUSTED_LEARNING_RESOURCES);
  const navigation = result.learning_navigation;
  const weaknessCandidates = allowedTags.has("REVIEW:NO_CONFIRMED_ISSUES")
    ? []
    : navigation.weaknesses;

  return {
    ...result,
    learning_navigation: {
      weaknesses: weaknessCandidates
        .filter((item) => hasAllowedEvidenceTag(item, allowedTags))
        .slice(0, 3),
      learning_path: navigation.learning_path
        .filter((item) => hasAllowedEvidenceTag(item.topic, allowedTags))
        .slice(0, 3)
        .map((item, index) => ({
          ...item,
          step: index + 1,
          resources: item.resources
            .filter((resource) => trustedResources.has(resource))
            .slice(0, 3),
        })),
      recommended_exercises: navigation.recommended_exercises
        .filter(
          (item) =>
            catalogById.has(item.id) &&
            hasAllowedEvidenceTag(item.purpose, allowedTags),
        )
        .slice(0, 3)
        .map((item) => {
          const catalogItem = catalogById.get(item.id)!;
          return {
            ...item,
            title: catalogItem.title,
            difficulty: catalogItem.difficulty,
            url: catalogItem.url,
          };
        }),
    },
  };
}

export function validateNavigationGrounding(
  result: NavigationOutput,
  allowedTags: ReadonlySet<string>,
  exerciseCatalog: ExerciseCatalogItem[],
): string[] {
  const navigation = result.learning_navigation;
  const issues = validateGroundedStatements(
    [
      ...navigation.weaknesses,
      ...navigation.learning_path.map((item) => item.topic),
      ...navigation.recommended_exercises.map((item) => item.purpose),
    ],
    allowedTags,
  );
  const trustedResources = new Set<string>(TRUSTED_LEARNING_RESOURCES);
  if (
    allowedTags.has("REVIEW:NO_CONFIRMED_ISSUES") &&
    navigation.weaknesses.length > 0
  ) {
    issues.push("weaknesses are not allowed when review confirms no defect");
  }
  for (const step of navigation.learning_path) {
    for (const resource of step.resources) {
      if (!trustedResources.has(resource)) {
        issues.push(`learning resource is not in the trusted catalog: ${resource}`);
      }
    }
  }
  const exerciseCatalogById = new Map(
    exerciseCatalog.map((item) => [item.id, item]),
  );
  for (const exercise of navigation.recommended_exercises) {
    const catalogItem = exerciseCatalogById.get(exercise.id);
    if (!catalogItem) {
      issues.push(`exercise is not in the supplied catalog: ${exercise.id}`);
      continue;
    }
    if (
      exercise.title !== catalogItem.title ||
      exercise.difficulty !== catalogItem.difficulty ||
      exercise.url !== catalogItem.url
    ) {
      issues.push(`exercise metadata differs from catalog: ${exercise.id}`);
    }
  }
  if (navigation.weaknesses.length > 3) issues.push("more than 3 weaknesses");
  if (navigation.learning_path.length > 3)
    issues.push("more than 3 learning steps");
  if (navigation.recommended_exercises.length > 3)
    issues.push("more than 3 exercises");
  return issues;
}

export function navigationEvidenceTags(input: {
  codeReviewResult?: string;
  knowledgeGraph?: string;
  studentHistory?: string;
  studentProfileSummary?: string;
  sessionContext?: unknown[];
}): Set<string> {
  const tags = new Set<string>();
  if (input.codeReviewResult) tags.add("REVIEW");
  for (const tag of extractEvidenceTags(input.codeReviewResult ?? "")) {
    const codeLines = tag.match(/^CODE:L(\d+)(?:-L(\d+))?$/);
    if (!codeLines) {
      tags.add(tag);
      continue;
    }
    const start = Number(codeLines[1]);
    const end = Number(codeLines[2] ?? codeLines[1]);
    for (let line = start; line <= end; line += 1) {
      tags.add(`CODE:L${line}`);
    }
  }
  if (input.knowledgeGraph) tags.add("GRAPH");
  if (input.studentHistory) tags.add("HISTORY");
  if (input.studentProfileSummary) tags.add("PROFILE");
  if (input.sessionContext?.length) tags.add("DIALOGUE");
  return tags;
}
