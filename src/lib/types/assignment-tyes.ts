import { SubmissionStatus } from "@prisma/client";

export interface Question {
  id: string;
  title: string;
  description: string;
  language: string;
  cppStandard?: "c++11" | "c++17";
  testCases: TestCase[];
  symbolicRules?: string[];
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
  description?: string | null;
}

export interface EvaluationMetric {
  id: string;
  name: string;
  description?: string;
  weight: number;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: Date | null;
  createdAt: Date;
  questionCount: number;
  submissionCount: number;
  copyPastePrevention: boolean;
  fullScreenEnforcement: boolean;
  metrics?: EvaluationMetric[];
}

export interface AssignmentById extends Assignment {
  questions: Question[];
  persistedQuestionStatuses?: Record<string, "idle" | "tests-passed" | "full">;
}

// Grading Table Header Types
export interface GradingTableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width: string;
}

export interface AssignmentMetricInfo {
  id: string;
  name: string;
  description?: string;
  weight: number;
}

export interface GradingTableHeaderData {
  id: string;
  title: string;
  testCaseWeight: number;
  metricsWeight: number;
  metrics: AssignmentMetricInfo[];
}

export interface GradingTableHeaderResponse {
  success: boolean;
  columns: GradingTableColumn[];
  assignment: GradingTableHeaderData;
  error?: string;
}

// Grading Table Data Types
export interface GradingTableStudent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  overallScore: number;
  status: SubmissionStatus;
  submissions: GradingTableSubmission[];
  overallSubmission: GradingTableSubmission;
}

export interface GradingTableSubmission {
  id: string;
  studentId: string;
  testCaseScore: number;
  metricScores: GradingTableMetricScore[];
  totalScore: number;
  status: SubmissionStatus;
  submittedAt?: string;
}

export interface GradingTableMetricScore {
  metricId: string;
  metricName: string;
  score: number;
  weight: number;
}

export interface GradingTableData {
  students: GradingTableStudent[];
  metrics: AssignmentMetricInfo[];
}

// Student Progress Types (from server actions)
export interface StudentProgress {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  score: number;
  questionsCompleted: number;
  submissions: any[]; // CodeSubmission array from Prisma
}

// Transform function types
export interface TransformStudentDataParams {
  studentData: StudentProgress[];
  assignmentData: GradingTableHeaderData;
}
