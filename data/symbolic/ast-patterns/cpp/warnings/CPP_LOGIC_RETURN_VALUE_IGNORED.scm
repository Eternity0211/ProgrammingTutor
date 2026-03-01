; ==============================================================================
; CPP_LOGIC_RETURN_VALUE_IGNORED
; 函数返回值被忽略。精确判断需知返回类型，纯 AST 难以实现。
; 启发式：匹配对可能返回错误码的函数的调用（如 scanf, printf 等）作为独立语句。
; 简化：匹配 call_expression 在 expression_statement 中且非赋值/条件的一部分。
; ==============================================================================

(expression_statement
  (call_expression) @target
)
(#match? @target "\\b(scanf|printf|fscanf|fprintf|sscanf|sprintf|open|read|write|malloc|alloc)\\s*\\(")
