; ==============================================================================
; CPP_LOGIC_ARRAY_INITIALIZATION_INCOMPLETE
; 数组声明时指定大小但初始化列表元素少于大小，未初始化元素为未定义。
; 启发式：匹配 array_declarator 带 size 且 value 为 initializer_list 的声明。
; ==============================================================================

(declaration
  declarator: (init_declarator
    declarator: (array_declarator
      size: (number_literal) @size
    )
    value: (initializer_list) @init
  )
) @target