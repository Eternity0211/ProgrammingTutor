; ==============================================================================
; CPP_TYPE_NARROWING_CONVERSION
; 窄化转换：如 double 赋给 int、long 赋给 int。CPP_IMPLICIT_NARROWING 已覆盖部分。
; 此处匹配初始化列表中的窄化（如 int x{3.14}）。
; ==============================================================================

(init_declarator
  value: (initializer_list
    (number_literal) @target
  )
)
(#match? @target "\\.")