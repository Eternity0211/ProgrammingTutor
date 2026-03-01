; ==============================================================================
; CPP_ASSIGNMENT_OPERATOR_SELF_ASSIGN
; 启发式：检测 operator= 中赋值表达式左右为同一标识符（如 x = x）但未做自赋值检查。
; 简化：匹配 operator= 函数体内 *this = other 或类似，且函数开头无 if (this == &other)。
; 更简：匹配 operator= 体内存在 left == right 的赋值（自赋值风险）。
; ==============================================================================

; 匹配 operator= 的 function_definition
(function_definition
  declarator: (function_declarator
    declarator: (operator_name) @op
  )
  body: (compound_statement) @body
) @target
(#match? @op "operator\\s*=")
(#not-match? @body "this\\s*==\\s*&|&\\s*other\\s*\)|this\\s*==\\s*&\\s*\\w+\\s*\)")