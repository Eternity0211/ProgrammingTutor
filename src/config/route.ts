export const API_ROOT = "/api";

export const API_SUBMISSION_ROOT = `${API_ROOT}/submissions`;
export const WEBHOOK_JUDGE0 = `${API_ROOT}/webhook/judge0`;

export const EXTERNAL_JUDGE0_API =
  process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";

export const ROUTES = {
  HOME: "/",
  CLASSES: "/classes",
  LOGIN: "/login",
  REGISTER: "/register",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  JOIN_CLASS: (code: string) => `/classes?join=${encodeURIComponent(code)}`,

  // 班级详情页
  CLASS_DETAILS: (code: string) => `/classes/${code}`,
  CLASS_CREATE_ASSIGNMENT: (code: string) => `/classes/${code}/create`,

  // 作业相关
  ASSIGNMENT_DETAILS: (code: string, id: string) => `/classes/${code}/${id}`,
  ASSIGNMENT_GRADING: (code: string, id: string) =>
    `/classes/${code}/${id}/grading`,
  ASSIGNMENT_SUBMISSIONS: (code: string, id: string) =>
    `/classes/${code}/${id}/submissions`,
  SUBMISSION_DETAILS: (
    code: string,
    assignmentId: string,
    submissionId: string,
  ) => `/classes/${code}/${assignmentId}/submissions/${submissionId}`,

  // 用户中心
  PROFILE: "/profile",
  SETTINGS: "/settings",
  DIALOGUE: "/dialogue",
};

export const AUTH_ROUTES = {
  SIGN_IN: "/login",
  SIGN_UP: "/register",
  ERROR: "/login",
};
