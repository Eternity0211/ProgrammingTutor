"use client";
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
} from "lucide-react";

export const featureCards = [
  {
    icon: Code,
    title: "Monaco Code Editor",
    description:
      "VSCode-powered editor with syntax highlighting, IntelliSense auto-completion, and support for 11 programming languages.",
  },
  {
    icon: CheckCircle,
    title: "Dual-Mode Grading",
    description:
      "Automated test case evaluation (60%) combined with AI-powered code quality assessment (40%) for comprehensive grading.",
  },
  {
    icon: Brain,
    title: "AI-Powered Features",
    description:
      "Generate test cases automatically and evaluate code quality using Groq's Llama 3.3 70B model.",
  },
  {
    icon: Shield,
    title: "Academic Integrity",
    description:
      "Copy-paste prevention, fullscreen enforcement, and submission tracking to maintain assessment security.",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description:
      "Sandboxed code execution via Judge0 with instant feedback on compilation, runtime, and memory usage.",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Analytics",
    description:
      "Track submission history, score distributions, completion rates, and performance metrics with export capabilities.",
  },
];

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
    description:
      "Sandboxed Judge0 containers with resource limits (2s CPU, 128MB memory)",
  },
  {
    icon: Brain,
    title: "Groq AI Integration",
    description:
      "Llama 3.3 70B model for intelligent test generation and code evaluation",
  },
  {
    icon: Zap,
    title: "Webhook Architecture",
    description:
      "Asynchronous processing for scalable code execution and grading",
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
