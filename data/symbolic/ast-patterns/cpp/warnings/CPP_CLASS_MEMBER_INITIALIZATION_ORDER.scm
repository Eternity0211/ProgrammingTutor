; ==============================================================================
; CPP_CLASS_MEMBER_INITIALIZATION_ORDER
; 成员初始化顺序应与类中声明顺序一致，否则可能使用未初始化成员。
; 启发式：检测构造函数中的初始化列表（含多个初始化器），提示检查与声明顺序一致。
; ==============================================================================

(function_definition
  declarator: (function_declarator declarator: (identifier) @name)
  body: (compound_statement) @body
) @target
(#match? @body ":\\s*\\w+\\s*\\(")