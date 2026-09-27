/**
 * @file parser.ts
 * @description 符号分析引擎的基础设施层 (Infrastructure Layer)。
 * 职责：
 * 1. 封装 web-tree-sitter 的复杂加载逻辑（WASM、单例模式）。
 * 2. 提供类型安全的 AST 解析接口。
 * 3. 抹平底层库在不同版本/环境下的 API 差异（如 Query 的构造方式）。
 * @module Symbolic/Infrastructure
 */

import path from "path";
import fs from "fs";
import {
  Language as WebTreeSitterLanguage,
  Parser as WebTreeSitterParser,
  Query as WebTreeSitterQuery,
} from "web-tree-sitter";

// =============================================================================
// Type Definitions (Facade & Stability) | 类型定义
// =============================================================================

/*
 * 直接从模块中提取辅助类型。
 * 这种方式避免了直接 import 整个模块可能导致的 "Namespace used as Type" 错误，
 * 同时确保我们使用的类型与安装的 web-tree-sitter 版本保持一致。
 */
export type Tree = import("web-tree-sitter").Tree;
export type Query = import("web-tree-sitter").Query;
export type Point = import("web-tree-sitter").Point;
export type Language = import("web-tree-sitter").Language;
export type QueryCapture = import("web-tree-sitter").QueryCapture;

/*
 * 稳健地获取 SyntaxNode 类型。
 * 某些版本的定义文件中未直接导出 SyntaxNode，但 Tree.rootNode 的类型必然是 SyntaxNode。
 */
export type SyntaxNode = Tree["rootNode"];

/**
 * 手动定义的 Parser 接口。
 * * 动机：web-tree-sitter 的导出对象在 CommonJS/ESM 混用时极其混乱（既是类又是命名空间）。
 * 通过显式定义此接口，我们解耦了编译期类型检查与运行时实现，
 * 避免了 "Type 'typeof import...' is not a constructor" 等经典 TypeScript 错误。
 */
export type Parser = WebTreeSitterParser;

// =============================================================================
// Configuration & Singleton State | 配置与单例状态
// =============================================================================

const PUBLIC_DIR = path.join(process.cwd(), "public");
const WASM_FILE = "tree-sitter-cpp.wasm";
const WEB_TS_WASM_FILE = "web-tree-sitter.wasm";

/** 解析器实例缓存 (单例) */
let parserInstance: Parser | null = null;

/** 语言定义缓存 (单例)，避免重复加载 WASM */
let cppLanguage: Language | null = null;

// =============================================================================
// Core Logic | 核心逻辑
// =============================================================================

/**
 * 获取或初始化 Parser 单例。
 * 该方法实现了懒加载 (Lazy Loading)，确保 WASM 文件只被读取和编译一次。
 * * @returns {Promise<Parser>} 准备就绪的解析器实例
 * @throws {Error} 如果 WASM 文件缺失或初始化失败
 */
export async function getParser(): Promise<Parser> {
  // 如果已初始化，直接返回缓存
  if (parserInstance && cppLanguage) {
    return parserInstance;
  }

  // 1. 初始化底层运行时
  try {
    await WebTreeSitterParser.init({
      // In Next.js server (especially Docker), resolve runtime wasm explicitly
      // instead of relying on bundler-generated vendor chunk paths.
      locateFile(scriptName: string) {
        if (scriptName === WEB_TS_WASM_FILE) {
          return path.join(
            process.cwd(),
            "node_modules",
            "web-tree-sitter",
            WEB_TS_WASM_FILE,
          );
        }
        return scriptName;
      },
    });
  } catch (e) {
    console.error("[Parser] Runtime initialization failed:", e);
    throw new Error("Parser initialization failed");
  }

  const parser = new WebTreeSitterParser();
  const absoluteWasmPath = path.join(PUBLIC_DIR, WASM_FILE);

  // 2. 加载语言包 WASM
  try {
    if (!fs.existsSync(absoluteWasmPath)) {
      throw new Error(`WASM file not found at: ${absoluteWasmPath}`);
    }

    // 使用 fs 读取 buffer 而非 Language.load(path)，
    // 是为了规避 Next.js 服务端与 Jest 测试环境下对相对路径解析的不一致问题。
    const wasmBuffer = fs.readFileSync(absoluteWasmPath);
    cppLanguage = await WebTreeSitterLanguage.load(wasmBuffer);
  } catch (e: unknown) {
    // 初始化失败时重置状态，防止残留脏数据
    parserInstance = null;
    cppLanguage = null;

    console.error(`[Parser] Failed to load WASM at ${absoluteWasmPath}`);
    console.error(
      `[Parser] Reason: ${e instanceof Error ? e.message : String(e)}`,
    );
    throw new Error(
      `Critical: Could not load ${WASM_FILE}. Ensure it exists in /public folder.`,
    );
  }

  // 3. 绑定语言并更新单例
  parser.setLanguage(cppLanguage);

  // 类型断言：运行时生成的实例符合我们定义的 Parser 接口契约
  parserInstance = parser as Parser;

  return parserInstance;
}

/**
 * 获取当前的 C++ 语言定义对象。
 * 通常由 static/errors.ts 等模块调用，用于编译 SCM 查询。
 */
export async function getLanguage(): Promise<Language> {
  if (!cppLanguage) {
    await getParser(); // 确保完成初始化链
  }
  return cppLanguage!;
}

// =============================================================================
// Public API | 公共接口
// =============================================================================

/**
 * 解析 C++ 源代码并生成抽象语法树 (AST)。
 * 这是外部模块调用 Parser 的主要入口。
 * * @param sourceCode - 待分析的 C++ 代码
 */
export async function parseCode(sourceCode: string): Promise<Tree> {
  const parser = await getParser();
  const tree = parser.parse(sourceCode);
  if (!tree) throw new Error("Parser returned no syntax tree");
  return tree;
}

/**
 * 创建 Tree-sitter Query 对象。
 * * 这是一个工厂方法，用于屏蔽底层 API 的破坏性变更：
 * - 标准版本：使用 `new Query(language, source)`
 * - 旧版本/某些绑定：使用 `language.query(source)`
 * * @param language - 语言定义
 * @param source - SCM 查询语句
 */
export function createQuery(language: Language, source: string): Query {
  // 策略 1: 优先尝试标准的构造函数调用
  return new WebTreeSitterQuery(language, source);
}
