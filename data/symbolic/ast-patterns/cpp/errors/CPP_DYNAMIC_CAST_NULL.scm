; ==============================================================================
; CPP_DYNAMIC_CAST_NULL
; 启发式：检测 dynamic_cast<Type*>(expr) 后直接解引用，未检查 nullptr。
; 模式：*dynamic_cast<...>(...) 或 dynamic_cast<...>(...)->member
; 简化：匹配 dynamic_cast 后紧跟 * 或 -> 的表达式（需在父节点中匹配）。
; ==============================================================================

; 模式1：*dynamic_cast<...>(...)
(unary_expression
  argument: (call_expression) @target
  (#match? @target "dynamic_cast\\s*<")
)

; 模式2：dynamic_cast<...>(...)->xxx  (field_expression 的 argument 为 call)
(field_expression
  argument: (call_expression) @target
  (#match? @target "dynamic_cast\\s*<")
)
