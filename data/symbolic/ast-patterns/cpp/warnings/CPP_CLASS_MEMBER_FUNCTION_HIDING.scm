; ==============================================================================
; CPP_CLASS_MEMBER_FUNCTION_HIDING
; 派生类中与基类同名但参数不同的函数会隐藏基类函数；若意图重写应加 override。
; 启发式：检测派生类中与基类同名的成员函数未使用 override。
; ==============================================================================

(class_specifier
  (base_class_clause)
  body: (field_declaration_list
    (function_definition
      declarator: (function_declarator) @decl
    ) @target
  )
)
(#not-match? @target "\\boverride\\b")
