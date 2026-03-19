export interface TestResults {
  description: string;
  passed: boolean;
  isBonus: boolean;
  executionTime: number | null;
  error: string | null;
}

export interface judgeResult {
  stdout: string;
  time: string;
  memory: number;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}

export interface CodeRunner {
  input: string;
  runtime: string;
  memory: string;
  status: string;
  output: string;
  error: string;
  hidden: boolean;
}

export interface SymbolicResult {
  engine: string; // 符号引擎名称
  diagnostics: string[]; // 诊断出的逻辑/符号错误
  traceabilityId?: string; // 关联到 Neo4j 知识图谱的 ID
}

export interface AIFeedback {
  causalAnalysis: string; // AI 因果分析反馈
  suggestions: string[]; // 改进建议
  confidence: number; // 置信度
}

export interface CodeSubmissionDetail {
  id: string;
  code: string;
  status: string; // 映射自 Prisma 的 CodeEvaluationStatus
  testCaseResults: any[];
  symbolicOutput?: SymbolicResult; // 新增：符号引擎输出
  aiFeedback?: AIFeedback; // 新增：AI 评估反馈
  score: number | null;
}
