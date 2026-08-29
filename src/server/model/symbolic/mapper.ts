/**
 * @file mapper.ts
 * @description 符号分析转换层 (Transformation Layer)。
 * 负责将分析引擎产出的原始数据 (RawIssue) 与规则注册表 (JSON) 关联，
 * 转换为带有教学建议、知识点和修复代码的富文本 Issue 对象。
 * @module Symbolic/Transformation
 */

import fs from "fs";
import path from "path";
// 引入统一的类型定义
import {
  RawIssue,
  SymbolicIssue,
  SymbolicSeverity,
} from "../../../lib/types/symbolic-types";

/** 内部使用的 JSON 定义文件结构 */
interface DefinitionFile {
  definitions: Record<string, any>;
}

// =============================================================================
// Internal Utilities | 内部工具函数
// =============================================================================

/**
 * 从本地磁盘加载指定的 JSON 定义文件
 * @param filename - 配置文件名 (例如 'cpp-errors.json')
 * @returns 返回定义的规则字典，若文件不存在则返回空对象
 */
function loadDefinitionFile(filename: string): Record<string, any> {
  const filePath = path.resolve(
    process.cwd(),
    "data/symbolic/definitions",
    filename,
  );

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: DefinitionFile = JSON.parse(raw);
    return parsed.definitions ?? {};
  } catch (e) {
    console.error(`[Mapper] Failed to parse definition file: ${filename}`, e);
    return {};
  }
}

/**
 * 字符串模板插值工具
 * 将模板中的占位符 (例如 {name}) 替换为 meta 对象中对应的实际值
 * @param template - 消息模板字符串
 * @param meta - 包含实际参数值的键值对
 * @returns 替换完成后的字符串
 */
function interpolate(
  template?: string,
  meta?: Record<string, string | number>,
): string | undefined {
  if (!template) return undefined;
  if (!meta) return template;

  return template.replace(/\{(\w+)\}/g, (_, key) =>
    meta[key] !== undefined ? String(meta[key]) : `{${key}}`,
  );
}

// =============================================================================
// Public API | 公共接口
// =============================================================================

/**
 * 将原始的错误与警告数据映射为富文本教学 Issue
 * 该方法会读取本地定义的规则库，执行模板变量替换，并合并位置信息
 * @param rawErrors - 原始错误列表
 * @param rawWarnings - 原始警告列表
 * @returns 包含 errors 和 warnings 分类的 Issue 集合
 */
export function mapIssues(
  rawIssues: RawIssue[],
  rawWarnings: RawIssue[],
): { errors: SymbolicIssue[]; warnings: SymbolicIssue[] } {
  // 加载静态规则库
  const errorDefs = loadDefinitionFile("cpp-errors.json");
  const warningDefs = loadDefinitionFile("cpp-warnings.json");

  /**
   * 内部转换逻辑：将单条 RawIssue 转换为富文本 SymbolicIssue
   */
  function mapOne(
    raw: RawIssue,
    definitions: Record<string, any>,
  ): SymbolicIssue | null {
    const def = definitions[raw.ruleId];

    // 若规则 ID 未在定义文件中注册，则忽略该条目 (过滤未知规则)
    if (!def) {
      return null;
    }

    // 确定最终消息：优先使用动态覆盖的消息，否则使用插值后的模板消息
    const finalMessage =
      raw.message ?? interpolate(def.message, raw.meta) ?? "";

    return {
      ruleId: raw.ruleId,
      severity: (def.severity as SymbolicSeverity) || "Medium",
      display_name: def.display_name || raw.ruleId,
      message: finalMessage,
      pedagogical_label: def.pedagogical_label || "General",
      knowledge_concept: def.knowledge_concept || "cpp_basic",
      description: def.description,
      remediation: def.remediation,
      remediation_code: def.remediation_code,
      location: raw.location,
      meta: raw.meta,
    };
  }

  return {
    errors: rawIssues
      .map((r) => mapOne(r, errorDefs))
      .filter((i): i is SymbolicIssue => i !== null),

    warnings: rawWarnings
      .map((r) => mapOne(r, warningDefs))
      .filter((i): i is SymbolicIssue => i !== null),
  };
}
