; ==============================================================================
; CPP_FUNCTION_RETURN_LOCAL_PTR
; 检测函数返回指向局部变量的指针：
;   int* foo() {
;     int x = 0;
;     return &x;         // 返回局部变量地址，离开函数后悬垂
;   }
;
; 约定：
; - @target  ：return 语句节点，用于高亮
; - @def_name：局部变量名
; - @use_name：在取地址表达式中被取地址的同名标识符
; ==============================================================================

(compound_statement
  (declaration
    declarator: [
      (identifier) @def_name
      (init_declarator
        declarator: (identifier) @def_name)
    ]
  )
  (_)*
  (return_statement
    (unary_expression
      argument: (identifier) @use_name
    ) @target
  )
  (#eq? @def_name @use_name)
)

