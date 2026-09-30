export interface BreadcrumbItem {
  href: string;
  label: string;
  isLast: boolean;
}

const STATIC_LABELS: Record<string, string> = {
  classes: "Classes",
  create: "Create assignment",
  grading: "Grading",
  submissions: "Submissions",
  dialogue: "AI Tutor",
  profile: "Profile",
  settings: "Settings",
  submission: "Submission",
};

export function getBreadcrumbSegments(pathname: string): string[] {
  if (!pathname.startsWith("/") || pathname.length > 2048) return [];
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

function fallbackLabel(segments: string[], index: number): string {
  const segment = segments[index];
  if (STATIC_LABELS[segment]) return STATIC_LABELS[segment];

  if (segments[0] === "classes") {
    if (index === 1) return "Class";
    if (index === 2) return "Assignment";
    if (index >= 4 && segments[index - 1] === "submissions") {
      return "Submission";
    }
  }

  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildBreadcrumbs(
  pathname: string,
  labels: Record<string, string> = {},
): BreadcrumbItem[] {
  const segments = getBreadcrumbSegments(pathname);

  return segments.map((_, index) => {
    const encodedSegments = segments
      .slice(0, index + 1)
      .map((segment) => encodeURIComponent(segment));
    const href = `/${encodedSegments.join("/")}`;
    return {
      href,
      label: labels[href] || fallbackLabel(segments, index),
      isLast: index === segments.length - 1,
    };
  });
}
