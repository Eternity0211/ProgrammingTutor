"use strict";
/**
 * @file static/errors.ts
 * @description 静态分析 - 错误检查域 (Error Domain Static Analysis)。
 * 职责：
 * 1. 扫描 AST 中的原生语法错误 (Native Syntax Errors, 编译器级)。
 * 2. 执行基于 SCM 模式匹配的逻辑错误检查 (Logic Errors, 逻辑级)。
 * @module Symbolic/Static/Errors
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeErrors = analyzeErrors;
const parser_1 = require("../parser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// =============================================================================
// Configuration & Registry | 配置与注册表
// =============================================================================
/** 逻辑错误规则 (SCM) 的存放目录 */
const PATTERN_DIR = path_1.default.resolve(process.cwd(), "data/symbolic/ast-patterns/cpp/errors");
/** * 查询缓存池 (Query Cache)
 * key: ruleId (文件名), value: 预编译好的 Tree-sitter Query 对象
 * 作用：利用单例模式避免在每次请求时重复编译 SCM 文件，提升性能。
 */
let queryRegistry = null;
/**
 * 确保所有 SCM 规则已加载并编译。
 * 该函数是幂等的 (Idempotent)，只会初始化一次。
 */
async function ensureRegistry() {
    if (queryRegistry)
        return queryRegistry;
    queryRegistry = new Map();
    const language = await (0, parser_1.getLanguage)();
    // 若规则目录不存在（例如首次部署），静默返回空注册表
    if (!fs_1.default.existsSync(PATTERN_DIR)) {
        return queryRegistry;
    }
    // 自动扫描目录下的所有 .scm 文件
    const files = fs_1.default.readdirSync(PATTERN_DIR).filter((f) => f.endsWith(".scm"));
    for (const file of files) {
        const ruleId = path_1.default.parse(file).name; // 文件名即规则 ID (e.g. CPP_NEGATIVE_ARRAY_SIZE)
        const scmPath = path_1.default.join(PATTERN_DIR, file);
        try {
            const source = fs_1.default.readFileSync(scmPath, "utf-8");
            // 使用 parser.ts 提供的 createQuery 屏蔽底层 API 差异
            const query = (0, parser_1.createQuery)(language, source);
            queryRegistry.set(ruleId, query);
        }
        catch (e) {
            console.error(`[Static/Errors] Failed to compile SCM rule: ${ruleId}`, e);
        }
    }
    return queryRegistry;
}
const VALIDATORS = {
    // 针对 CPP_ARRAY_OOB_LITERAL 的数值比对逻辑
    "CPP_ARRAY_OOB_LITERAL": (captures) => {
        const name = captures["def_name"]?.text || "unknown_array";
        // 1. 获取定义大小
        const defSizeNode = captures["def_size"];
        // 2. 获取使用索引
        const useIndexNode = captures["use_index"];
        if (!defSizeNode || !useIndexNode)
            return null; // 捕获不全，跳过
        try {
            // 3. 数值转换与比对
            const size = parseInt(defSizeNode.text, 10);
            const index = parseInt(useIndexNode.text, 10);
            if (isNaN(size) || isNaN(index))
                return null;
            // 4. 核心逻辑：如果索引 >= 大小，则报错
            if (index >= size) {
                return "__no_message__"; // 仅表示验证失败，但使用默认消息模板，无需覆盖
            }
        }
        catch (e) {
            return null;
        }
        return null; // 验证通过，没有越界
    },
    "KEY": (captures) => {
        return "some dynamic message";
    }
};
// =============================================================================
// Core Analysis Pipeline | 核心分析流水线
// =============================================================================
/**
 * 执行全量错误分析。
 * 包含两个阶段：
 * 1. 原生语法检查 (Tree-sitter 内置能力)
 * 2. 逻辑规则匹配 (自定义 SCM 规则)
 * * @param tree - 由 parser.ts 生成的抽象语法树
 * @returns 原始错误列表 (RawIssue[])
 */
async function analyzeErrors(tree) {
    const issues = [];
    // Phase 1: Native Syntax Check (Tree-sitter Built-in)
    // 利用 Tree-sitter 原生的错误恢复机制检测语法错误
    collectNativeErrors(tree.rootNode, issues);
    // Phase 2: Logic Rule Check (SCM Pattern Matching)
    // 加载自定义规则进行逻辑扫描
    const queries = await ensureRegistry();
    // 遍历所有已注册的逻辑规则
    for (const [ruleId, query] of queries) {
        runQuery(tree.rootNode, ruleId, query, issues);
    }
    return issues;
}
// =============================================================================
// Phase 1: Native Syntax Errors | 原生语法检测
// =============================================================================
/**
 * 递归扫描 AST 中的错误节点。
 * 利用 `node.hasError` 标志位进行剪枝优化：如果子树无错，直接跳过。
 */
function collectNativeErrors(node, issues) {
    // 性能优化：如果当前节点及其子孙完全正确，无需深入遍历
    // 注意：在 web-tree-sitter 中 hasError 是属性访问，无需调用方法
    if (!node.hasError)
        return;
    // 发现具体的错误节点 (ERROR) 或缺失节点 (MISSING)
    // 这通常意味着代码无法通过编译
    if (node.isError || node.isMissing) {
        issues.push({
            ruleId: "CPP_SYNTAX_ERROR",
            location: {
                line: node.startPosition.row,
                column: node.startPosition.column,
            },
            // 提取错误片段作为 meta 信息，供 mapper 填充消息
            meta: {
                token: node.text.slice(0, 20) // 截取前20字符避免过长
            }
        });
        // 找到根源错误后，通常不再深入其内部，避免报错轰炸 (Error Cascading)
        return;
    }
    // 递归深入有问题的分支
    for (let i = 0; i < node.childCount; i++) {
        collectNativeErrors(node.child(i), issues);
    }
}
// =============================================================================
// Phase 2: Logic Errors (SCM) | 逻辑错误检测
// =============================================================================
/**
 * 运行单个 SCM 查询并提取捕获结果。
 * 负责将 Tree-sitter 的 Capture 转换为统一的 RawIssue 格式。
 */
function runQuery(root, ruleId, query, issues) {
    // query.matches() 返回匹配组，适合复杂的多节点关系
    const matches = query.matches(root);
    for (const match of matches) {
        let targetNode = null;
        const captureMap = {}; // 用于存储本次匹配的所有节点
        const meta = {};
        // 遍历本次匹配中的所有捕获 (Captures)
        for (const capture of match.captures) {
            const name = capture.name;
            // 把捕获的节点存入map
            captureMap[name] = capture.node;
            // 约定：名为 @target 的节点是报错主体，用于定位
            if (name === "target") {
                targetNode = capture.node;
            }
            // 约定：其他名称 (如 @name, @val) 提取为 meta 数据供 Mapper 使用
            else {
                meta[name] = capture.node.text;
            }
        }
        if (targetNode) {
            //执行自定义验证逻辑
            const validator = VALIDATORS[ruleId];
            let customMessage = null;
            if (validator) {
                // 如果有验证器，必须验证失败才算由 Error
                const validationError = validator(captureMap);
                if (!validationError) {
                    continue; // 验证通过，说明没有错误，跳过本次匹配
                }
                // 如果验证失败但没有返回特定消息，使用默认模板；如果返回了特定消息，则覆盖默认模板
                if (validationError !== "__no_message__") {
                    customMessage = validationError;
                }
            }
            issues.push({
                ruleId,
                location: {
                    line: targetNode.startPosition.row,
                    column: targetNode.startPosition.column,
                },
                // 如果 validator 返回了动态消息，可以覆盖 meta 或 message
                message: customMessage || undefined,
                meta, // 将提取到的变量名、数值等传递给 Mapper 进行模板插值
            });
        }
    }
}
