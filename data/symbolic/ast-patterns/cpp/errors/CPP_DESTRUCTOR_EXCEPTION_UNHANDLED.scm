; ==============================================================================
; CPP_DESTRUCTOR_EXCEPTION_UNHANDLED
; 检测析构函数体内包含 throw 语句。析构函数抛出异常可能导致程序终止。
; ==============================================================================

(function_definition
  declarator: (function_declarator
    declarator: (destructor_name) @dtor
  )
  body: (compound_statement) @body @target
  (#match? @body "\\bthrow\\b")
)
