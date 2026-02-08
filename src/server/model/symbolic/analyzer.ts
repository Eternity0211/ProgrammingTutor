/**
 * 符号模型侧 - C++ AST 源码分析器
 *
 * 核心职责：
 * 1. 管理 web-tree-sitter 实例及 C++ 语言包的生命周期。
 * 2. 动态扫描并加载 `data/symbolic/ast-patterns/cpp` 下的 SCM 规则文件。
 * 3. 执行 AST 查询，提取代码中的结构性问题，输出标准化的 `SymbolicIssueRaw`。
 */

import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { createRequire } from "module";
import type {
  SymbolicIssueRaw,
  CppSymbolicRuleId,
} from "@/lib/types/symbolic-types";

// =============================================================================
// 1. 核心依赖加载 (Robust Module Loading)
// =============================================================================

// 使用 createRequire 确保在 Next.js/TSX 环境下能正确加载 CommonJS 格式的 web-tree-sitter
const require = createRequire(import.meta.url);
const rawModule = require("web-tree-sitter");

// 分别提取核心类：Parser (解析器), Language (语言定义), Query (查询引擎)
let Parser: any = null;
let Language: any = null;
let Query: any = null;

// 兼容性处理：自动识别 Named Exports 或 Default Exports 结构
if (rawModule.Parser) {
  Parser = rawModule.Parser;
  Language = rawModule.Language;
  Query = rawModule.Query;
} else if (rawModule.default) {
  Parser = rawModule.default;
  Language = rawModule.default.Language;
  Query = rawModule.default.Query;
}

// 确保核心类已加载
if (!Parser) {
  throw new Error("Critical: Failed to load 'Parser' class from web-tree-sitter.");
}
// 针对部分旧版本绑定的回退策略
if (!Language && Parser.Language) Language = Parser.Language;
if (!Query && Parser.Query) Query = Parser.Query;

if (!Language || !Query) {
  console.error("Module Keys:", Object.keys(rawModule));
  throw new Error("Critical: Failed to load 'Language' or 'Query' class.");
}

// =============================================================================
// 2. 配置与常量
// =============================================================================

const PUBLIC_DIR = path.join(process.cwd(), "public");
const WASM_FILE = "tree-sitter-cpp.wasm";
const PATTERNS_DIR = path.join(
  process.cwd(),
  "data",
  "symbolic",
  "ast-patterns",
  "cpp"
);

export type SupportedSymbolicLanguage = "cpp";

// =============================================================================
// 3. 状态管理 (单例缓存)
// =============================================================================

let parser: any | null = null;
let CppLanguage: any | null = null;
// 缓存预编译的 S-Expression 查询对象 (Key: RuleID, Value: Query)
const queryCache = new Map<string, any>();

// =============================================================================
// 4. 初始化逻辑
// =============================================================================

/**
 * 初始化分析器环境
 * 包括：WASM 加载、Parser 实例化、以及 SCM 规则文件的预编译
 */
async function initAnalyzer() {
  // 如果已初始化且规则已加载，直接返回
  if (parser && CppLanguage && queryCache.size > 0) return;

  // 1. 初始化 Tree-sitter 运行时
  try {
    await Parser.init();
  } catch (e) {
    console.error("Parser.init() failed:", e);
    throw e;
  }
  
  parser = new Parser();

  // 2. 加载 C++ 语言包 (.wasm)
  // 优先使用绝对路径以适应不同的运行环境 (Server Action vs Test Scripts)
  const absoluteWasmPath = path.join(PUBLIC_DIR, WASM_FILE);

  try {
    CppLanguage = await Language.load(absoluteWasmPath);
  } catch (e) {
    // 降级策略：尝试相对路径加载
    try {
        CppLanguage = await Language.load(WASM_FILE);
    } catch (e2) {
        throw new Error(`Critical: Could not load tree-sitter-cpp.wasm. Please ensure it is in ${PUBLIC_DIR}`);
    }
  }
  
  parser.setLanguage(CppLanguage);

  // 3. 动态编译 SCM 规则库
  if (fs.existsSync(PATTERNS_DIR)) {
    const files = await fsPromises.readdir(PATTERNS_DIR);
    const scmFiles = files.filter((f) => f.endsWith(".scm"));

    for (const file of scmFiles) {
      // 文件名作为规则 ID (移除扩展名)
      const ruleId = file.replace(".scm", "");
      const filePath = path.join(PATTERNS_DIR, file);

      try {
        const scmContent = await fsPromises.readFile(filePath, "utf-8");
        
        // 编译 S-Expression 查询并缓存
        try {
           const query = new Query(CppLanguage, scmContent);
           queryCache.set(ruleId, query);
        } catch (qErr) {
           console.warn(`[Analyzer] Failed to compile query for ${ruleId}:`, qErr);
        }

      } catch (err) {
        console.error(`[Analyzer] Failed to load rule definition: ${file}`, err);
      }
    }
  } else {
    console.warn(`[Analyzer] Patterns directory not found: ${PATTERNS_DIR}`);
  }
}

// =============================================================================
// 5. 主分析流程
// =============================================================================

/**
 * 执行源代码分析
 * @param language 目标语言 (目前仅支持 'cpp')
 * @param sourceCode C++ 源代码字符串
 * @returns 识别出的符号问题列表
 */
export async function analyzeSource(
  language: SupportedSymbolicLanguage,
  sourceCode: string
): Promise<SymbolicIssueRaw[]> {
  // 确保环境就绪
  await initAnalyzer();

  if (language !== "cpp") return [];
  if (!parser || !CppLanguage) throw new Error("Analyzer failed to initialize");

  // 生成 AST
  const tree = parser.parse(sourceCode);
  const issues: SymbolicIssueRaw[] = [];

  try {
    // 遍历所有预加载的规则进行匹配
    for (const [ruleId, query] of queryCache.entries()) {
      try {
        // 在 AST 上执行查询
        const matches = query.matches(tree.rootNode);

        for (const match of matches) {
          const issue = convertMatchToIssue(
            ruleId as CppSymbolicRuleId,
            match,
            sourceCode
          );
          if (issue) {
            issues.push(issue);
          }
        }
      } catch (err) {
        console.error(`[Analyzer] Error executing rule ${ruleId}:`, err);
      }
    }
  } finally {
    // 显式释放 C++ 对象内存，防止泄漏
    if (tree && typeof tree.delete === 'function') {
        tree.delete();
    }
  }

  return issues;
}

// =============================================================================
// 6. 数据转换与辅助函数
// =============================================================================

/**
 * 将 Tree-sitter 的查询匹配结果转换为统一的 Issue 格式
 * 约定：SCM 中使用 @target 或 @error 标记核心代码节点
 */
function convertMatchToIssue(
  ruleId: CppSymbolicRuleId,
  match: any, 
  sourceCode: string
): SymbolicIssueRaw | null {
  const captures = match.captures || [];

  // 1. 定位核心节点
  let targetNode = captures.find(
    (c: any) => c.name === "target" || c.name === "error"
  )?.node;

  // 兜底：若未指定 target，默认取第一个捕获节点
  if (!targetNode) {
    if (captures.length > 0) {
      targetNode = captures[0].node;
    } else {
      return null;
    }
  }

  // 2. 提取元数据 (Metadata)
  // 将捕获的其他字段 (@name, @val 等) 存入 metadata 供 mapper 使用
  const metadata: Record<string, any> = {};

  for (const capture of captures) {
    if (capture.name !== "target" && capture.name !== "error") {
      const text = capture.node.text;
      const num = Number(text);
      // 自动类型推断：如果是纯数字则存储为 number，否则为 string
      metadata[capture.name] = isNaN(num) ? text : num;
    }
  }

  // 3. 构建返回对象
  return {
    id: ruleId,
    range: {
      start: {
        line: targetNode.startPosition.row + 1,
        column: targetNode.startPosition.column + 1,
      },
      end: {
        line: targetNode.endPosition.row + 1,
        column: targetNode.endPosition.column + 1,
      },
    },
    snippet: targetNode.text,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}