/**
 * @file static/warnings.ts
 * @description 静态分析 - 警告检查域 (Warning Domain Static Analysis)。
 * 职责：
 * 1. 扫描代码风格问题 (Style Issues, e.g. 命名规范)。
 * 2. 检测潜在的最佳实践违规 (Best Practice Violations, e.g. 使用 goto)。
 * 3. 仅执行 SCM 逻辑规则匹配，不涉及编译器级错误检测。
 * @module Symbolic/Static/Warnings
 */

import {
  Tree,
  Query,
  SyntaxNode,
  getLanguage,
  createQuery, // 使用 parser 提供的工厂函数以屏蔽底层 API 版本差异
} from "../parser";

import { RawIssue } from "../../../../lib/types/symbolic-types";
import fs from "fs";
import path from "path";

// =============================================================================
// Configuration & Registry | 配置与注册表
// =============================================================================

/** 警告规则 (SCM) 的存放目录 */
const PATTERN_DIR = path.resolve(
  process.cwd(),
  "data/symbolic/ast-patterns/cpp/warnings",
);

/** * 查询缓存池 (Query Cache)
 * key: ruleId (文件名), value: 预编译好的 Tree-sitter Query 对象
 * 作用：单例模式缓存编译后的查询对象，避免重复 I/O 和编译开销。
 */
let queryRegistry: Map<string, Query> | null = null;

/**
 * 确保所有 Warning SCM 规则已加载并编译。
 * 该函数是幂等的 (Idempotent)，首次调用时会读取磁盘并构建缓存。
 */
async function ensureRegistry(): Promise<Map<string, Query>> {
  if (queryRegistry) return queryRegistry;

  queryRegistry = new Map();
  const language = await getLanguage();

  // 若规则目录不存在（例如初次初始化），静默返回空注册表
  if (!fs.existsSync(PATTERN_DIR)) {
    return queryRegistry;
  }

  // 自动扫描目录下的所有 .scm 文件作为规则源
  const files = fs.readdirSync(PATTERN_DIR).filter((f) => f.endsWith(".scm"));

  for (const file of files) {
    const ruleId = path.parse(file).name; // 文件名即规则 ID (e.g. CPP_NO_GOTO)
    const scmPath = path.join(PATTERN_DIR, file);

    try {
      const source = fs.readFileSync(scmPath, "utf-8");
      // 使用 parser.ts 提供的 createQuery 确保跨版本兼容性
      const query = createQuery(language, source);
      queryRegistry.set(ruleId, query);
    } catch (e) {
      console.error(
        `[Static/Warnings] Failed to compile SCM rule: ${ruleId}`,
        e,
      );
    }
  }

  return queryRegistry;
}

// =============================================================================
// Core Analysis Pipeline | 核心分析流水线
// =============================================================================

/**
 * 执行全量警告分析。
 * 流程：
 * 1. 准备注册表（加载 .scm 规则）。
 * 2. 对 AST 根节点执行所有已注册的查询。
 * * 注意：与 errors.ts 不同，此处**不执行**原生语法检查 (collectNativeErrors)，
 * 因为 Warning 通常针对的是语法正确但风格不佳的代码。
 * * * @param tree - 由 parser.ts 生成的抽象语法树
 * @returns 原始警告列表 (RawIssue[])
 */
export async function analyzeWarnings(tree: Tree): Promise<RawIssue[]> {
  const issues: RawIssue[] = [];

  // 加载并缓存所有已注册的警告规则
  const queries = await ensureRegistry();

  // 遍历规则并执行查询
  for (const [ruleId, query] of queries) {
    runQuery(tree.rootNode, ruleId, query, issues);
  }

  return issues;
}

// =============================================================================
// Pattern Matching Logic | 模式匹配逻辑
// =============================================================================

/**
 * 运行单个 SCM 查询并提取捕获结果。
 * 负责将 Tree-sitter 的 Capture 转换为统一的 RawIssue 格式。
 */
function runQuery(
  root: SyntaxNode,
  ruleId: string,
  query: Query,
  issues: RawIssue[],
) {
  // 执行查询，获取所有匹配项 (Matches)
  const matches = query.matches(root);

  for (const match of matches) {
    let targetNode: SyntaxNode | null = null;
    const meta: Record<string, string | number> = {};

    // 遍历本次匹配中的所有捕获 (Captures)
    for (const capture of match.captures) {
      const name = capture.name;

      // 约定：名为 @target 的节点是警告主体，用于定位高亮
      if (name === "target") {
        targetNode = capture.node;
      }
      // 约定：其他名称 (如 @name, @val) 提取为 meta 数据，供 Mapper 插值
      else {
        meta[name] = capture.node.text;
      }
    }

    // 只有找到了 @target 节点，才算一次有效的警告命中
    if (targetNode) {
      issues.push({
        ruleId,
        location: {
          line: targetNode.startPosition.row,
          column: targetNode.startPosition.column,
        },
        meta, // 传递元数据 (e.g. { name: "i" })
      });
    }
  }
}
