import {
  demoAssignments,
  demoClasses,
  demoConversations,
  demoProfiles,
  demoQuestions,
  demoSubmissions,
  demoUsers,
} from "../../prisma/demo-data";

describe("demo dataset", () => {
  it("covers multiple teachers, students, classes, and assignments", () => {
    expect(
      demoUsers.filter(({ role }) => role === "FACULTY").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      demoUsers.filter(({ role }) => role === "STUDENT").length,
    ).toBeGreaterThanOrEqual(4);
    expect(demoClasses.length).toBeGreaterThanOrEqual(3);
    expect(demoAssignments.length).toBeGreaterThanOrEqual(5);
    expect(demoQuestions.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps every relationship internally valid", () => {
    const emails = new Set(demoUsers.map(({ email }) => email));
    const classCodes = new Set(demoClasses.map(({ code }) => code));
    const assignmentIds = new Set(demoAssignments.map(({ id }) => id));
    const questionIds = new Set(demoQuestions.map(({ id }) => id));

    for (const classroom of demoClasses) {
      expect(emails.has(classroom.facultyEmail)).toBe(true);
      classroom.studentEmails.forEach((email) =>
        expect(emails.has(email)).toBe(true),
      );
    }
    demoAssignments.forEach(({ classCode }) =>
      expect(classCodes.has(classCode)).toBe(true),
    );
    demoQuestions.forEach(({ assignmentId, tests }) => {
      expect(assignmentIds.has(assignmentId)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });
    demoSubmissions.forEach(({ studentEmail, assignmentId, questionId }) => {
      expect(emails.has(studentEmail)).toBe(true);
      expect(assignmentIds.has(assignmentId)).toBe(true);
      expect(questionIds.has(questionId)).toBe(true);
    });
  });

  it("includes LLM history and a profile for every demo student", () => {
    const studentEmails = demoUsers
      .filter(({ role }) => role === "STUDENT")
      .map(({ email }) => email);
    const profileEmails = new Set(
      demoProfiles.map(({ userEmail }) => userEmail),
    );
    studentEmails.forEach((email) =>
      expect(profileEmails.has(email)).toBe(true),
    );
    expect(demoConversations.length).toBeGreaterThanOrEqual(3);
    demoConversations.forEach(({ messages }) => {
      expect(messages.some(({ role }) => role === "user")).toBe(true);
      expect(messages.some(({ role }) => role === "assistant")).toBe(true);
    });
  });
});
