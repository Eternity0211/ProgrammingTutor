import { darkCardColors, lightCardColors } from "@/config/constants";
import {
  getAssigmentTitleFromId,
  getClassNameFromCode,
} from "@/server/actions/utility-actions";
import {
  StudentProgress,
  GradingTableHeaderData,
  GradingTableData,
  GradingTableStudent,
  GradingTableSubmission,
} from "@/lib/types/assignment-tyes";
import { type ClassValue, clsx } from "clsx";
import { randomUUID } from "crypto";
import { twMerge } from "tailwind-merge";

import { SourceLocation } from "./types/symbolic-types";

// Tailwind 样式合并核心工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 项目路由导航核心
export async function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  for (let i = 0; i < paths.length; i++) {
    let label = paths[i];
    const href = `/${paths.slice(0, i + 1).join("/")}`;
    const isLast = i === paths.length - 1;

    if (i === 1) {
      const className = await getClassNameFromCode(paths[i]);
      if (className) label = className;
    }

    if (i === 2) {
      const assignmentTitle = await getAssigmentTitleFromId(paths[i]);
      if (assignmentTitle) label = assignmentTitle;
    }

    breadcrumbs.push({ href, label, isLast });
  }

  return breadcrumbs;
}

/**
 * 精简移除的无关函数
 * 

// 首字母大写
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// 蛇形命名转换
export function snakeCase(string: string) {
  return string.toLowerCase().replace(/ /g, "_");
}

// 短横线命名转换
export function kebabCase(string: string) {
  return string.toLowerCase().replace(/ /g, "-");
}

// 句子格式转换
export const sentenceCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// 全小写转换
export const lowerCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1).toLowerCase();
};

*/

// 标题格式转换
export const titleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// URL 有效性检查 
export const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

// 数字简写格式化
export function formatNumberShort(num: number | string): string {
  // Convert string numbers with commas to number type
  const normalizedNum =
    typeof num === "string" ? Number(num.replace(/,/g, "")) : num;

  const lookup = [
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "k" },
  ];

  const item = lookup.find((item) => Math.abs(normalizedNum) >= item.value);

  if (item) {
    const formattedNum = (normalizedNum / item.value)
      .toFixed(1)
      .replace(/\.0$/, "");
    return `${formattedNum}${item.symbol}`;
  }

  return normalizedNum.toString();
}

// 绝对 URL 生成
export const absoluteUrl = (path: string) => {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL).toString();
};

// 随机卡片背景色获取
export const getCardBgColor = (theme: string | undefined) => {
  const palette = theme === "dark" ? darkCardColors : lightCardColors;
  return palette[Math.floor(Math.random() * palette.length)];
};

// 课堂代码生成
export const generateClassroomCode = () => {
  return randomUUID().slice(0, 6);
};

// 复制文本到剪贴板
export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// 状态映射函数
export function mapStatus(status: string): "passed" | "failed" | "running" {
  switch (status) {
    case "PASSED":
      return "passed";
    case "PENDING":
      return "running";
    default:
      return "failed";
  }
}

// 导出评分表为 CSV 文件
export function exportGradingTableToCSV(
  filteredData: GradingTableStudent[],
  data: GradingTableData,
): void {
  const headers = [
    "Student Name",
    "Email",
    "Overall Score",
    ...data.metrics.map((m) => `${m.name} (${m.weight}%)`),
    "Status",
  ];

  const rows = filteredData.map((student) => [
    student.name,
    student.email,
    student.overallScore.toFixed(1),
    ...data.metrics.map((metric) => {
      const score =
        student.overallSubmission?.metricScores.find(
          (m) => m.metricId === metric.id,
        )?.score || 0;
      return score.toString();
    }),
    student.status || "NOT_STARTED",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grading-table-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// 随机教育图标获取
export const getRandomEducationIcon = (): string => {
  const educationIcons = [
    "CalculatorIcon",
    "Atom01Icon",
    "TestTubeIcon",
    "Chemistry01Icon",
    "SchoolIcon",
    "UniversityIcon",
    "LibraryIcon",
    "NotebookIcon",
    "UserAccountIcon",
  ];

  const randomIndex = Math.floor(Math.random() * educationIcons.length);
  return educationIcons[randomIndex];
};

// 学生评分数据转换
export function transformStudentDataForGrading(
  students: StudentProgress[],
  assignmentData: GradingTableHeaderData,
): GradingTableData {
  const transformedStudents: GradingTableStudent[] = students.map((student) => {
    const numberOfSubmissions = student.submissions?.length || 0;

    let avgScore = 0;
    if (numberOfSubmissions > 0) {
      avgScore = student.score;
    } else {
      avgScore =
        student.submissions
          .map((submission) => submission.score)
          .reduce((acc, curr) => acc + curr, 0) / numberOfSubmissions;
    }

    const avgTestCaseScore =
      student.submissions?.reduce((acc, curr) => acc + curr.testCaseScore, 0) /
        numberOfSubmissions || 0;

    const metricScores = assignmentData.metrics.map((metric) => {
      const metricResult =
        student.submissions?.reduce(
          (acc, curr) =>
            acc +
            curr.metricResults.find((mr: any) => mr.metricId === metric.id)
              ?.score,
          0,
        ) / numberOfSubmissions || 0;
      return {
        metricId: metric.id,
        metricName: metric.name,
        score: metricResult,
        weight: metric.weight,
      };
    });

    const overallSubmission: GradingTableSubmission = {
      id: student.submissions[0]?.id || `temp-${student.id}`,
      studentId: student.id,
      testCaseScore: avgTestCaseScore,
      metricScores: metricScores,
      totalScore: avgScore,
      status: student.status,
      submittedAt: student.submittedAt || undefined,
    };

    const submissions: GradingTableSubmission[] = student.submissions.map(
      (submission) => ({
        id: submission.id,
        studentId: student.id,
        testCaseScore: submission.testCaseScore,
        metricScores: submission.metricResults,
        totalScore: submission.score,
        status: submission.codeEvaluationStatus,
        submittedAt: submission.createdAt || undefined,
      }),
    );

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      overallScore: student.score,
      status: student.status,
      overallSubmission: overallSubmission,
      submissions: submissions,
    };
  });

  return {
    students: transformedStudents,
    metrics: assignmentData.metrics,
  };
}


// 将符号引擎的 Location 转换为 Monaco 的 Range 格式
export function locationToMonacoRange(loc: SourceLocation) {
  return {
    startLineNumber: loc.line,
    startColumn: loc.column,
    endLineNumber: loc.line,
    endColumn: loc.column + 1, // 默认为当前字符高亮
  };
}

// 格式化 AI 反馈，屏蔽 Markdown 代码块防止作弊
export function formatCausalFeedback(text: string): string {
  // 移除所有 ```cpp ... ``` 或 ``` ... ``` 代码块
  return text.replace(/```[\s\S]*?```/g, "_[代码修复建议已根据教学原则隐藏，请参考下方逻辑思路]_");
}