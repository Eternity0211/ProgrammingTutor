; ==============================================================================
; CPP_MAGIC_NUMBER
; 核心逻辑：捕获代码逻辑中出现的裸露数字，但排除 0, 1, -1 和常量定义场景。
; ==============================================================================

; 1. 二元表达式中的魔数 (逻辑判断与算术运算)
; 场景：if (x > 100), width * 0.5
(binary_expression
  [(number_literal) @target @value]
  ; 排除 0, 1, -1 (包括浮点数形式如 0.0, 1.0)
  (#not-match? @value "^(-?0|-?1)(\\.0*)?$")
)

; 2. 函数调用参数中的魔数
; 场景：sleep(1000), setOpacity(0.8)
(call_expression
  arguments: (argument_list
    (number_literal) @target @value
  )
  (#not-match? @value "^(-?0|-?1)(\\.0*)?$")
)

; 3. 赋值语句中的魔数 (非初始化)
; 场景：x = 50; (注意：int x = 50; 是 init_declarator，此处不会匹配，从而避开了常量定义)
(assignment_expression
  right: (number_literal) @target @value
  (#not-match? @value "^(-?0|-?1)(\\.0*)?$")
)

; 4. 数组声明中的固定大小 (高危场景)
; 场景：int buffer[256]; -> 应该用 const int BUFFER_SIZE = 256;
(array_declarator
  size: (number_literal) @target @value
)

; 5. 下标访问中的魔数
; 场景：arr[5] -> 为什么是 5?
(subscript_expression
  indices: (subscript_argument_list
    (number_literal) @target @value
  )
  (#not-match? @value "^(-?0|-?1)$")
)

; 6. Return 语句中的魔数
; 场景：return 404;
(return_statement
  (number_literal) @target @value
  (#not-match? @value "^(-?0|-?1)$")
)