"use client";
import { Bug01Icon } from "hugeicons-react";
import {
  Code,
  CheckCircle,
  Users,
  Shield,
  BookOpen,
  FileCode,
  CheckSquare,
  Sparkles,
  Brain,
  Lock,
  Zap,
  BusIcon,
} from "lucide-react";
import { title } from "process";

export const featureCards = [
  {
    icon: Code,
    title: "Monaco Code Editor",
    description:
      "基于 VSCode 核心引擎，深度支持 C++ 11/17 标准，提供语法高亮、IntelliSense 智能补全及实时错误诊断。",
  },
  {
    icon: CheckCircle,
    title: "Dual-Mode Grading",
    description:
      "自动化测试用例评测（60%）与 AI 代码质量深度评估（40%）有机结合，构建全方位的学术评价体系。",
  },
  {
    icon: Brain,
    title: "AI-Powered Features",
    description:
      "结合深度学习的语义理解与符号逻辑的严谨性，为学生代码提供精准的因果反馈与逻辑缺陷分析。",
  },
  {
    icon: Shield,
    title: "Academic Integrity",
    description:
      "集成剪贴板管控、全屏强制模式及多维度行为追踪，有效维护在线测评的公平性与严肃性。",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description:
      "基于 Judge0 的安全沙箱环境，实现毫秒级代码编译运行，并提供 CPU 占用与内存消耗的精确度量。",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Analytics",
    description:
      "追踪提交历史、分数分布及知识点掌握情况，支持一键导出结构化分析数据，辅助精准教学决策。",
  },
];

// 新增：Capabilities feature data
export const capabilityFeatures = [
  {
    icon: BookOpen,
    title: "智能代码诊断与优化",
    description:
      "融合神经符号技术，实现代码语法、逻辑与复杂度的全方位检测，提供因果式错误解释与精准的性能优化方案。",
  },
  {
    icon: Users,
    title: "自适应学习路径规划",
    description:
      "基于动态构建的学习者画像，智能识别知识薄弱点，动态推送适配习题与学习资源，实现千人千面的个性化教学。"
  },
  {
    icon: CheckSquare,
    title: "多端协同教学赋能",
    description:
      "打通学生端智能辅导与教师端学情分析，通过多智能体协同，提供沉浸式学习体验与数据驱动的教学决策支持。"
  },
]

// Educator feature data
export const educatorFeatures = [
  {
    icon: FileCode,
    title: "Smart Assignment Builder",
    description:
      "Create multi-question assignments with AI-generated test cases, custom metrics, and configurable scoring weights.",
  },
  {
    icon: Users,
    title: "Real-Time Progress Monitoring",
    description:
      "Track student submission status, view live completion rates, and monitor assignment progress in real-time.",
  },
  {
    icon: CheckSquare,
    title: "Flexible Evaluation System",
    description:
      "Combine automated test case grading with AI-powered code quality metrics for comprehensive assessment.",
  },
];

// Student feature data
export const studentFeatures = [
  {
    icon: Code,
    title: "Professional IDE Experience",
    description:
      "Monaco editor with multi-cursor support, language-specific formatting, and intelligent code completion.",
  },
  {
    icon: Zap,
    title: "Instant Test Execution",
    description:
      "Run custom test cases before submission with detailed execution metrics and error diagnostics.",
  },
  {
    icon: Shield,
    title: "Clear Feedback System",
    description:
      "Receive immediate compilation results, test case outcomes, and AI-generated code quality feedback.",
  },
];

export const educatorSteps = [
  {
    number: "01",
    icon: BookOpen,
    title: "Create a Classroom",
    description:
      "Set up virtual classrooms with unique access codes and manage student enrollment effortlessly.",
  },
  {
    number: "02",
    icon: Brain,
    title: "Design Smart Assignments",
    description:
      "Build assignments with AI-generated test cases and custom evaluation metrics for comprehensive grading.",
  },
  {
    number: "03",
    icon: CheckSquare,
    title: "Review & Analyze",
    description:
      "Access detailed submission analytics, test results, and AI-powered code quality assessments.",
  },
];

export const studentSteps = [
  {
    number: "01",
    icon: Users,
    title: "Join Your Class",
    description:
      "Enter your classroom code or use the invite link to join your instructor's virtual classroom.",
  },
  {
    number: "02",
    icon: Code,
    title: "Code & Test",
    description:
      "Write code in the Monaco editor and test with custom inputs before final submission.",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Submit & Learn",
    description:
      "Submit your solutions and receive instant feedback on test cases and code quality metrics.",
  },
];

// Updated with realistic initial stats
export const stats = [
  { value: "11", label: "Programming Languages" },
  { value: "2-5s", label: "Execution Time" },
  { value: "AI", label: "Powered Evaluation" },
  { value: "100%", label: "Automated Grading" },
];

// New section: Technical highlights
export const technicalHighlights = [
  {
    icon: Lock,
    title: "Secure Execution",
    description: "Sandboxed Judge0 containers with resource limits (2s CPU, 128MB memory)",
  },
  {
    icon: Brain,
    title: "Groq AI Integration",
    description: "Llama 3.3 70B model for intelligent test generation and code evaluation",
  },
  {
    icon: Zap,
    title: "Webhook Architecture",
    description: "Asynchronous processing for scalable code execution and grading",
  },
  {
    icon: Shield,
    title: "OAuth 2.0 Auth",
    description: "Secure Google authentication with JWT session management",
  },
];

// Supported languages with accurate list
export const supportedLanguages = [
  "Python",
  "JavaScript",
  "TypeScript", 
  "Java",
  "C",
  "C++",
  "Go",
  "Rust",
  "Bash",
  "Assembly",
  "Python for ML",
];

// Feature comparison for pricing/tiers (if needed)
export const featureComparison = {
  implemented: [
    "Automated test case execution",
    "AI-powered test case generation",
    "AI-powered code evaluation",
    "Real-time progress monitoring",
    "Copy-paste prevention",
    "Fullscreen enforcement",
    "Multi-language support",
    "Submission history tracking",
    "Export analytics data",
    "Custom evaluation metrics",
    "Weighted scoring system",
    "Google OAuth authentication",
  ],
  planned: [
    "Plagiarism detection",
    "Advanced code similarity analysis",
    "Collaborative coding sessions",
    "Mobile application",
    "API for third-party integration",
    "Video proctoring",
    "Peer review system",
    "Custom language support",
    "Intelligent hints system",
  ],
};
