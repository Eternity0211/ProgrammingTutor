; ==============================================================================
; CPP_FUNCTION_RETURN_LOCAL_REF
; 检测函数返回对局部变量的引用：
;   int& foo() {
;     int x = 0;
;     return x;          // 返回局部变量引用，离开函数后悬垂
;   }
;
; 约定：
; - @target  ：return 语句节点，用于高亮
; - @def_name：局部变量名
; - @use_name：在 return 中被返回的同名标识符
; ==============================================================================

(compound_statement
  (declaration
    declarator: [
      (identifier) @def_name
      (init_declarator
        declarator: (identifier) @def_name)
    ]
  )
  (_)*                                   ; 中间可以有任意语句
  (return_statement
    (identifier) @use_name) @target
  (#eq? @def_name @use_name)
)

