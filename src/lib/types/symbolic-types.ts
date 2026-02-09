/**
 * 符号引擎类型契约
 *
 * 确保符号引擎输出的每一个 ruleId 都能在 data/symbolic/definitions/cpp-defs.json
 * 中找到对应项；与 definitions 结构对齐，供 model/symbolic、validators 和前端共用。
 */

/** 源码位置（行、列从 1 开始） */
export interface SourceLocation {
  line: number;
  column: number;
}

/** 源码区间 */
export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * 与 cpp-defs.json 中单条定义结构一致。
 * 新增 C++ 诊断规则时必须包含 display_name、severity、pedagogical_label 等字段；
 * message、remediation 为可选，用于前端提示与修复建议。
 */
export interface SymbolicDefinition {
  display_name: string;
  pedagogical_label: string;
  knowledge_concept: string;
  severity: SymbolicSeverity;
  description: string;
  /** 面向用户的简短提示信息 */
  message?: string;
  /** 修复建议或正确写法说明 */
  remediation?: string;
}

/** 严重程度：与 definitions 中 severity 取值对齐 */
export type SymbolicSeverity = "Critical" | "High" | "Medium" | "Low";

/**
 * C++ 符号规则 ID：与 data/symbolic/definitions/cpp-defs.json 的 key 一一对应。
 * 新增规则时在此补充，保证 ruleId 与 definitions 可匹配。
 */
export type CppSymbolicRuleId =
  | "CPP_ASSIGNMENT_IN_IF"
  | "CPP_ARRAY_OOB_LITERAL"
  | "CPP_ARRAY_OOB_VARIABLE"
  | "CPP_NULL_POINTER_DEREF"
  | "CPP_UNINIT_VAR_USAGE"
  | "CPP_DANGLING_POINTER"
  | "CPP_DOUBLE_FREE"
  | "CPP_USE_AFTER_FREE"
  | "CPP_BUFFER_OVERFLOW"
  | "CPP_STR_NOT_NULL_TERMINATED"
  | "CPP_SWITCH_NO_DEFAULT"
  | "CPP_MISSING_BREAK"
  | "CPP_NON_VOID_NO_RETURN"
  | "CPP_IMPLICIT_NARROWING"
  | "CPP_UNSAFE_CAST"
  | "CPP_VOID_POINTER_USE"
  | "CPP_UNREACHABLE_CODE"
  | "CPP_INFINITE_LOOP_RISK"
  | "CPP_SELF_ASSIGNMENT"
  | "CPP_VIRTUAL_DESTRUCTOR_MISSING"
  | "CPP_ITERATOR_INVALIDATION"
  | "CPP_RESERVED_IDENTIFIER"
  | "CPP_DIVISION_BY_ZERO"
  | "CPP_UNINIT_MEMBER"
  | "CPP_RECURSION_NO_BASE"
  | "CPP_NEGATIVE_INDEX";

/**
 * 符号引擎输出的「原始发现」。
 * id 必须为 definitions 中存在的规则 ID，否则 mapper 无法解析为完整 SymbolicIssue。
 */
export interface SymbolicIssueRaw {
  id: string;
  range: SourceRange;
  snippet: string;
  metadata?: Record<string, unknown>;
}

/**
 * 映射后的告警结构：原始发现 + 教学定义。
 * 供 UI、反馈系统、神经侧 Prompt 使用。
 */
export interface SymbolicIssue {
  id: string;
  range: SourceRange;
  snippet: string;
  metadata?: Record<string, unknown>;
  definition: SymbolicDefinition;
}

/**
 * definitions 文件结构（如 cpp-defs.json）
 */
export interface SymbolicDefinitionsFile {
  definitions: Record<string, SymbolicDefinition>;
}

/**
 * 符号分析统一入口的入参：语言 + 源码
 */
export interface SymbolicAnalyzeInput {
  language: "cpp";
  sourceCode: string;
}

/**
 * 符号分析统一出口：原始发现列表（mapper 再转为 SymbolicIssue[]）
 */
export type SymbolicAnalyzeOutput = SymbolicIssueRaw[];
