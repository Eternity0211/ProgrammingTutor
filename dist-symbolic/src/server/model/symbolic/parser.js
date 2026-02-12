"use strict";
/**
 * @file parser.ts
 * @description 符号分析引擎的基础设施层 (Infrastructure Layer)。
 * 职责：
 * 1. 封装 web-tree-sitter 的复杂加载逻辑（WASM、单例模式）。
 * 2. 提供类型安全的 AST 解析接口。
 * 3. 抹平底层库在不同版本/环境下的 API 差异（如 Query 的构造方式）。
 * @module Symbolic/Infrastructure
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParser = getParser;
exports.getLanguage = getLanguage;
exports.parseCode = parseCode;
exports.createQuery = createQuery;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// =============================================================================
// Module Loading & Polyfills | 模块加载与兼容
// =============================================================================
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawModule = require("web-tree-sitter");
// 运行时实现类 (Implementation Classes)
let ParserImp = null;
let LanguageImp = null;
let QueryImp = null;
/*
 * 兼容性加载策略：
 * 不同的构建工具 (Webpack, Vite, Jest) 和运行环境 (Node, Browser)
 * 对 CommonJS/ESM 的互操作处理不同。这里逐一尝试可能的挂载点。
 */
if (rawModule.Parser) {
    ParserImp = rawModule.Parser;
    LanguageImp = rawModule.Language;
    QueryImp = rawModule.Query;
}
else if (rawModule.default) {
    ParserImp = rawModule.default;
    LanguageImp = rawModule.default.Language || rawModule.Language;
    QueryImp = rawModule.default.Query || rawModule.Query;
}
else {
    ParserImp = rawModule;
    LanguageImp = rawModule.Language;
    QueryImp = rawModule.Query;
}
// 核心依赖检查
if (!ParserImp) {
    throw new Error("Critical: Failed to load 'web-tree-sitter'. Check your node_modules compatibility.");
}
// =============================================================================
// Configuration & Singleton State | 配置与单例状态
// =============================================================================
const PUBLIC_DIR = path_1.default.join(process.cwd(), "public");
const WASM_FILE = "tree-sitter-cpp.wasm";
/** 解析器实例缓存 (单例) */
let parserInstance = null;
/** 语言定义缓存 (单例)，避免重复加载 WASM */
let cppLanguage = null;
// =============================================================================
// Core Logic | 核心逻辑
// =============================================================================
/**
 * 获取或初始化 Parser 单例。
 * 该方法实现了懒加载 (Lazy Loading)，确保 WASM 文件只被读取和编译一次。
 * * @returns {Promise<Parser>} 准备就绪的解析器实例
 * @throws {Error} 如果 WASM 文件缺失或初始化失败
 */
async function getParser() {
    // 如果已初始化，直接返回缓存
    if (parserInstance && cppLanguage) {
        return parserInstance;
    }
    // 1. 初始化底层运行时
    try {
        await ParserImp.init();
    }
    catch (e) {
        console.error("[Parser] Runtime initialization failed:", e);
        throw new Error("Parser initialization failed");
    }
    const parser = new ParserImp();
    const absoluteWasmPath = path_1.default.join(PUBLIC_DIR, WASM_FILE);
    // 2. 加载语言包 WASM
    try {
        if (!fs_1.default.existsSync(absoluteWasmPath)) {
            throw new Error(`WASM file not found at: ${absoluteWasmPath}`);
        }
        // 使用 fs 读取 buffer 而非 Language.load(path)，
        // 是为了规避 Next.js 服务端与 Jest 测试环境下对相对路径解析的不一致问题。
        const wasmBuffer = fs_1.default.readFileSync(absoluteWasmPath);
        cppLanguage = await LanguageImp.load(wasmBuffer);
    }
    catch (e) {
        // 初始化失败时重置状态，防止残留脏数据
        parserInstance = null;
        cppLanguage = null;
        console.error(`[Parser] Failed to load WASM at ${absoluteWasmPath}`);
        console.error(`[Parser] Reason: ${e.message}`);
        throw new Error(`Critical: Could not load ${WASM_FILE}. Ensure it exists in /public folder.`);
    }
    // 3. 绑定语言并更新单例
    parser.setLanguage(cppLanguage);
    // 类型断言：运行时生成的实例符合我们定义的 Parser 接口契约
    parserInstance = parser;
    return parserInstance;
}
/**
 * 获取当前的 C++ 语言定义对象。
 * 通常由 static/errors.ts 等模块调用，用于编译 SCM 查询。
 */
async function getLanguage() {
    if (!cppLanguage) {
        await getParser(); // 确保完成初始化链
    }
    return cppLanguage;
}
// =============================================================================
// Public API | 公共接口
// =============================================================================
/**
 * 解析 C++ 源代码并生成抽象语法树 (AST)。
 * 这是外部模块调用 Parser 的主要入口。
 * * @param sourceCode - 待分析的 C++ 代码
 */
async function parseCode(sourceCode) {
    const parser = await getParser();
    return parser.parse(sourceCode);
}
/**
 * 创建 Tree-sitter Query 对象。
 * * 这是一个工厂方法，用于屏蔽底层 API 的破坏性变更：
 * - 标准版本：使用 `new Query(language, source)`
 * - 旧版本/某些绑定：使用 `language.query(source)`
 * * @param language - 语言定义
 * @param source - SCM 查询语句
 */
function createQuery(language, source) {
    // 策略 1: 优先尝试标准的构造函数调用
    if (QueryImp) {
        return new QueryImp(language, source);
    }
    // 策略 2: 降级尝试旧版 API (挂载在 Language 实例上的工厂方法)
    if (language.query) {
        return language.query(source);
    }
    throw new Error("[Parser] WebTreeSitter Query constructor not found. Incompatible library version.");
}
