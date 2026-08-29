export const API_ROOT = "/api";

export const API_SUBMISSION_ROOT = `${API_ROOT}/submissions`;

export const API_SYMBOLIC_ANALYZE = `${API_ROOT}/analyze/symbolic`;
export const API_LLM_EVALUATE = `${API_ROOT}/evaluate/llm`;

export const WEBHOOK_JUDGE0 = `${API_ROOT}/webhooks/judge0`;

export const EXTERNAL_JUDGE0_API =
  process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";

export const ROUTES = {
  HOME: "/",
  CLASSES: "/classes",
  INVITE: (code: string) => `/invite/${code}`,

  // 班级详情页
  CLASS_DETAILS: (code: string) => `/classes/${code}`,

  // 作业相关
  ASSIGNMENTS: "/assignments",
  ASSIGNMENT_DETAILS: (id: string) => `/assignments/${id}`,
  ASSIGNMENT_GRADING: (id: string) => `/assignments/${id}/grading`,

  // 用户中心
  ONBOARDING: "/onboarding",
  PROFILE: "/profile",
};

export const AUTH_ROUTES = {
  SIGN_IN: "/auth/signin",
  SIGN_UP: "/auth/signup",
  ERROR: "/auth/error",
};
