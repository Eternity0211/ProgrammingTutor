import { buildBreadcrumbs, getBreadcrumbSegments } from "@/lib/breadcrumbs";

describe("breadcrumbs", () => {
  it("creates readable fallbacks for nested classroom routes", () => {
    expect(
      buildBreadcrumbs("/classes/CPP101/assignment-1/submissions/submission-1"),
    ).toEqual([
      { href: "/classes", label: "Classes", isLast: false },
      { href: "/classes/CPP101", label: "Class", isLast: false },
      {
        href: "/classes/CPP101/assignment-1",
        label: "Assignment",
        isLast: false,
      },
      {
        href: "/classes/CPP101/assignment-1/submissions",
        label: "Submissions",
        isLast: false,
      },
      {
        href: "/classes/CPP101/assignment-1/submissions/submission-1",
        label: "Submission",
        isLast: true,
      },
    ]);
  });

  it("uses authorized server labels when available", () => {
    expect(
      buildBreadcrumbs("/classes/CPP101/assignment-1/grading", {
        "/classes/CPP101": "C++ Fundamentals",
        "/classes/CPP101/assignment-1": "Pointers",
      }).map(({ label }) => label),
    ).toEqual(["Classes", "C++ Fundamentals", "Pointers", "Grading"]);
  });

  it("encodes decoded path segments when constructing links", () => {
    expect(buildBreadcrumbs("/classes/C%2B%2B")[1]?.href).toBe(
      "/classes/C%2B%2B",
    );
  });

  it("rejects malformed or oversized paths before server lookup", () => {
    expect(getBreadcrumbSegments("classes/CPP101")).toEqual([]);
    expect(getBreadcrumbSegments(`/${"a".repeat(2048)}`)).toEqual([]);
  });
});
