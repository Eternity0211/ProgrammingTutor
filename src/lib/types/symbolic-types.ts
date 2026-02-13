/**
 * @file symbolic-types.ts
 * @description 符号分析引擎类型定义中心。
 * 该文件定义了符号引擎（Symbolic Engine）与 神经引擎（Neural Engine）、前端 UI 及 数据库 之间的交互契约。
 */

// =============================================================================
// 1. 基础图元 (Primitives)
// =============================================================================

/**
 * 源码位置 (Line/Column 1-based)
 * 与 Monaco Editor 及 Tree-sitter 的位置格式保持兼容
 */
export interface SourceLocation {
  line: number;   // 行号，从 1 开始
  column: number; // 列号，从 1 开始
}

/**
 * 源码范围 (用于前端高亮)
 * 目前 mapper.ts 主要输出 start 位置，预留 end 以支持范围高亮
 */
export interface SourceRange {
  start: SourceLocation;
  end?: SourceLocation; // 可选，未来扩展用于精确下划线标记
}

/**
 * 严重程度枚举
 * 对应 definitions/cpp-defs.json 中的 severity
 */
export type SymbolicSeverity = "Critical" | "High" | "Medium" | "Low";

// =============================================================================
// 2. 规则定义 (Rule Registry)
// =============================================================================

/**
 * C++ 符号规则 ID 枚举
 * 真理来源：必须与 data/symbolic/definitions/cpp-defs.json 中的 Key 完全一致。
 * 这是连接 SCM 规则文件名、JSON 定义和代码逻辑的唯一纽带。
 */
export type CppSymbolicRuleId =
  // --- 内存安全类 (Memory Safety) ---
  | "CPP_ARRAY_OOB_LITERAL"       // 数组越界（字面量）
  | "CPP_ARRAY_OOB_VARIABLE"      // 数组越界（变量推导）
  | "CPP_NULL_POINTER_DEREF"      // 空指针解引用
  | "CPP_DANGLING_POINTER"        // 悬垂指针
  | "CPP_USE_AFTER_FREE"          // 释放后使用
  | "CPP_BUFFER_OVERFLOW"         // 缓冲区溢出
  | "CPP_UNINIT_VAR_USAGE"        // 未初始化变量使用

  // --- 逻辑错误类 (Logic Errors) ---
  | "CPP_DIVISION_BY_ZERO"        // 除零错误
  | "CPP_INFINITE_LOOP_RISK"      // 死循环风险
  | "CPP_ASSIGNMENT_IN_IF"        // if 条件中误用赋值
  | "CPP_SWITCH_NO_DEFAULT"       // switch 缺少 default
  | "CPP_NON_VOID_NO_RETURN"      // 非 void 函数无返回值
  | "CPP_NEGATIVE_INDEX"          // 负数索引

  // --- 代码规范与最佳实践 (Best Practices) ---
  | "CPP_NO_GOTO"                 // 禁止 goto
  | "CPP_GLOBAL_VARIABLE"         // 滥用全局变量
  | "CPP_MAGIC_NUMBER"            // 魔法数字
  | "CPP_VAR_NAMING"              // 变量命名不规范
  | "CPP_DEEP_NESTING"            // 嵌套过深
  | "CPP_MISSING_SEMICOLON"       // 缺失分号 (Syntax)
  | "CPP_SYNTAX_ERROR";           // 通用语法错误

// =============================================================================
// 3. 核心输出结构 (Core Output Structures)
// =============================================================================

/**
 * 完整的符号分析问题对象 (Rich Issue)
 * 这是 mapper.ts 的输出产物，直接用于前端展示和数据库存储。
 * 融合了“运行时发现的信息”和“静态定义的教学知识”。
 */
export interface SymbolicIssue {
  /** 规则唯一标识符 */
  ruleId: CppSymbolicRuleId | string;
  
  /** 严重程度 */
  severity: SymbolicSeverity;
  
  /** 显示名称 (UI标题) */
  display_name: string;
  
  /** * 最终消息 
   * 已完成模板插值 (e.g. "数组大小不能为负数，你输入了: -5") 
   */
  message: string;
  
  /** * 教学标签 
   * 用于分类统计学生薄弱项 (e.g. "Memory Safety", "Control Flow") 
   */
  pedagogical_label: string;
  
  /** * 关联知识点 (Knowledge Graph Key)
   * 用于 Neo4j 查询前置知识 (e.g. "cpp_arrays", "pointers")
   */
  knowledge_concept: string;
  
  /** 详细描述 (Markdown 格式) */
  description?: string;
  
  /** 修复建议 (文本) */
  remediation?: string;
  
  /** 修复代码示例 (代码片段) */
  remediation_code?: string;
  
  /** 错误发生位置 */
  location: SourceLocation;
  
  /** * 原始元数据
   * 存储 AST 捕获的变量名、数值等，供 LLM 进一步分析使用 
   */
  meta?: Record<string, string | number>;
}

/**
 * 符号分析引擎的完整结果包
 * 对应 service.ts 的返回值
 */
export interface SymbolicResult {
  /** 阻断性错误 (Syntax Errors, Logic Bugs) */
  errors: SymbolicIssue[];
  
  /** 建议性警告 (Style, Best Practices) */
  warnings: SymbolicIssue[];
  
  /** 性能元数据 (用于系统监控) */
  metadata?: {
    parseTime?: number; // ms
    nodeCount?: number;
    analyzedAt?: string; // ISO Date
  };
}

// =============================================================================
// 4. 神经符号融合协议 (Neuro-Symbolic Protocol)
// =============================================================================

/**
 * 注入给 LLM 的上下文对象
 * 为了节省 Token，这是一个精简版的 SymbolicResult。
 * 它是 "Causal Feedback Prompt" 中的关键输入变量。
 */
export interface NeuroSymbolicContext {
  /** 只有 ID 和 Message，LLM 不需要看太详细的教学定义 */
  detected_issues: Array<{
    line: number;
    rule: string;
    message: string;
    evidence: string; // 来自 meta 的关键变量
  }>;
  
  /** 聚合的知识点标签，帮助 LLM 确定教学语气 */
  focus_concepts: string[];
}

/**
 * 原始发现 (Raw Finding)
 * 仅用于 mapper.ts 内部处理，外部不应直接使用
 */
export interface RawIssue {
  ruleId: string;
  location: SourceLocation;
  message?: string;
  meta?: Record<string, string | number>;
}