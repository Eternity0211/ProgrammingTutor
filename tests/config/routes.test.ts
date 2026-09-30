import { existsSync } from "node:fs";
import path from "node:path";
import { ROUTES, WEBHOOK_JUDGE0 } from "@/config/route";

describe("application route contract", () => {
  it("generates routes that match the nested classroom pages", () => {
    expect(ROUTES.CLASS_DETAILS("CPP101")).toBe("/classes/CPP101");
    expect(ROUTES.CLASS_CREATE_ASSIGNMENT("CPP101")).toBe(
      "/classes/CPP101/create",
    );
    expect(ROUTES.ASSIGNMENT_DETAILS("CPP101", "assignment-1")).toBe(
      "/classes/CPP101/assignment-1",
    );
    expect(ROUTES.ASSIGNMENT_GRADING("CPP101", "assignment-1")).toBe(
      "/classes/CPP101/assignment-1/grading",
    );
    expect(ROUTES.ASSIGNMENT_SUBMISSIONS("CPP101", "assignment-1")).toBe(
      "/classes/CPP101/assignment-1/submissions",
    );
    expect(
      ROUTES.SUBMISSION_DETAILS("CPP101", "assignment-1", "submission-1"),
    ).toBe("/classes/CPP101/assignment-1/submissions/submission-1");
  });

  it("uses the classes page for invitation links", () => {
    expect(ROUTES.JOIN_CLASS("CPP 101")).toBe("/classes?join=CPP%20101");
  });

  it("keeps public and API constants aligned with real routes", () => {
    const root = process.cwd();
    for (const routeFile of [
      "src/app/(landing)/privacy/page.tsx",
      "src/app/(landing)/terms/page.tsx",
      "src/app/(dashboard)/classes/page.tsx",
      "src/app/api/webhook/judge0/route.ts",
    ]) {
      expect(existsSync(path.join(root, routeFile))).toBe(true);
    }
    expect(WEBHOOK_JUDGE0).toBe("/api/webhook/judge0");
  });
});
