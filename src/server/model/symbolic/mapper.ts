/**
 * 符号模型侧 - 规则库映射器 (Rule Mapper)
 *
 * 核心职责：
 * 1. 加载并校验 `data/symbolic/definitions/cpp-defs.json` 规则定义文件。
 * 2. 将 Analyzer 输出的原始 AST 问题 (SymbolicIssueRaw) 映射为包含完整教学解释的 SymbolicIssue。
 * 3. 充当 "事实" (Analyzer) 与 "知识" (Definitions) 之间的桥梁。
 */

import path from "path";
import fs from "fs";
import { z } from "zod";
import type {
  SymbolicIssueRaw,
  SymbolicIssue,
  SymbolicDefinition,
} from "@/lib/types/symbolic-types";

// =============================================================================
// 1. 规则定义校验 (Schema Validation)
// =============================================================================

// 本地定义 Zod Schema，确保运行时加载的 JSON 文件严格符合 TypeScript 接口定义
// 这防止了因配置文件拼写错误导致的潜在运行时崩溃
const LocalSymbolicDefinitionSchema = z.object({
  // 核心展示字段
  display_name: z.string(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  message: z.string(),
  pedagogical_label: z.string(), // 教学标签，如 "Logic Error"
  
  // 知识关联字段 (用于连接知识图谱或 LLM 上下文)
  knowledge_concept: z.string(), 

  // 辅助说明字段 (可选)
  description: z.string().optional(),
  remediation: z.string().optional(),
});

const LocalDefinitionsFileSchema = z.object({
  definitions: z.record(LocalSymbolicDefinitionSchema),
});

// =============================================================================
// 2. 数据加载与预处理 (Data Loading)
// =============================================================================

/**
 * 同步加载规则定义文件
 * 使用 fs 模块直接读取，确保在 Next.js 服务端环境中能稳定获取数据，
 * 避免因构建打包导致的模块导入路径问题。
 */
function loadDefinitions() {
  try {
    const jsonPath = path.join(
      process.cwd(),
      "data",
      "symbolic",
      "definitions",
      "cpp-defs.json"
    );

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Symbolic definitions file not found at: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(fileContent);

  } catch (error) {
    console.error("[Mapper] Failed to load cpp-defs.json:", error);
    throw error;
  }
}

// 初始化加载 (Module Level Scope)
// 在服务启动时执行一次，后续调用直接使用缓存的 parsed 结果
const rawData = loadDefinitions();

// =============================================================================
// 3. 数据校验与类型转换 (Validation & Casting)
// =============================================================================

const parsed = LocalDefinitionsFileSchema.safeParse(rawData);

if (!parsed.success) {
  console.error("❌ Symbolic Definitions Validation Failed!");
  console.error("Details:", JSON.stringify(parsed.error.flatten(), null, 2));
  throw new Error(`cpp-defs.json 格式校验失败，请检查字段完整性。`);
}

// 强制类型断言：经过 Zod 严格校验后，数据结构已确认为安全
const cppDefinitions = parsed.data.definitions as unknown as Record<string, SymbolicDefinition>;

// =============================================================================
// 4. 核心映射逻辑 (Mapping Logic)
// =============================================================================

/**
 * 将原始 AST 问题列表转换为富含教学信息的 Issue 对象
 * * @param issues Analyzer 产生的原始问题列表
 * @returns 注入了定义信息 (Definition) 的完整 Issue 列表
 */
export function mapCppIssues(issues: SymbolicIssueRaw[]): SymbolicIssue[] {
  const result: SymbolicIssue[] = [];
  
  for (const issue of issues) {
    // 根据 Rule ID 查找对应的教学定义
    const definition = cppDefinitions[issue.id];
    
    // 如果规则库中未定义该 ID (可能是新规则尚未配置 JSON)，则跳过，防止前端报错
    if (!definition) {
      // 仅在开发环境可开启此日志进行提示
      // console.warn(`[Mapper] Warning: No definition found for rule ID: ${issue.id}`);
      continue;
    }

    // 构建最终对象：合并 原始定位信息 + 动态元数据 + 静态教学定义
    const mapped: SymbolicIssue = {
      id: issue.id,
      range: issue.range,
      snippet: issue.snippet,
      // 仅当 metadata 存在时才透传，保持对象整洁
      ...(issue.metadata != null ? { metadata: issue.metadata } : {}),
      definition,
    };
    result.push(mapped);
  }
  
  return result;
}