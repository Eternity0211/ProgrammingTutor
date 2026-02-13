; ==============================================================================
; CPP_NON_VOID_NO_RETURN
; 检测返回类型非 void 且函数体中不包含 "return" 关键字的函数，
; 作为“可能缺少返回语句”的启发式规则。
;
; 约定：
; - @target：函数体 (compound_statement)，用于高亮整个函数块
; - @name  ：函数名，供 message 模板插值（如果需要）
; ==============================================================================

((function_definition) @target
  ; 函数定义整体文本中不包含 "void"（排除典型的 void 函数）
  (#not-match? @target "\\bvoid\\b")
  ; 函数体文本中不包含 "return" 关键字（极简启发式）
  (#not-match? @target "\\breturn\\b")
)

