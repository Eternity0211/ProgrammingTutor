; ==============================================================================
; CPP_CLASS_CONSTRUCTOR_EXPLICIT_MISSING
; 启发式：检测与类同名的函数（构造函数）且未带 explicit 关键字。
; 单参数构造函数未加 explicit 允许隐式转换，可能破坏类型安全。
; ==============================================================================

(class_specifier
  name: (type_identifier) @class_name
  body: (field_declaration_list
    (function_definition
      declarator: (function_declarator declarator: (identifier) @ctor_name)
    ) @target
  )
  (#eq? @class_name @ctor_name)
  (#not-match? @target "\\bexplicit\\b")
)
