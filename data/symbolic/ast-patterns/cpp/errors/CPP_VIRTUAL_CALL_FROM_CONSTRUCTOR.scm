; ==============================================================================
; CPP_VIRTUAL_CALL_FROM_CONSTRUCTOR
; 启发式：检测类定义内与类同名的函数（构造函数）体内包含成员函数调用。
; 构造函数中调用虚函数时派生类未完全构造，行为未定义。
; ==============================================================================

(class_specifier
  name: (type_identifier) @class_name
  body: (field_declaration_list
    (function_definition
      declarator: (function_declarator
        declarator: (identifier) @ctor_name
      )
      body: (compound_statement
        (call_expression) @target
      )
    )
  )
  (#eq? @class_name @ctor_name)
)
