export interface NavGroupInterface {
  title: string;
  url: string;
  icon: string;
  isActive: boolean;
}

export interface WebhookPayload {
  codeSubmissionId: string;
  testCaseId: string;
  questionId: string;
}

export enum Language {
  "C++" = "C++",
}
