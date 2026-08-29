; ==============================================================================
; CPP_ARRAY_OOB_LITERAL (Robust Version)
; 策略：拆分为三个独立模式，分别匹配赋值、函数调用/表达式、以及控制流。
; 避免在 [] 中使用字段名 (left:/right:) 以确保解析稳定性。
; ==============================================================================

; ------------------------------------------------------------------------------
; Pattern 1: 赋值语句中的越界 (Assignment)
; 覆盖: arr[5] = 1; | x = arr[5]; | arr[5] += 1;
; ------------------------------------------------------------------------------
(compound_statement
  (declaration
    declarator: [
      (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size)
      (init_declarator declarator: (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size))
    ]
  )
  (_)*
  (expression_statement
    (assignment_expression
      (subscript_expression
        argument: (identifier) @use_name
        indices: (subscript_argument_list (number_literal) @use_index)
      ) @target
    )
  )
  (#eq? @def_name @use_name)
)

; ------------------------------------------------------------------------------
; Pattern 2: 函数调用与独立表达式 (Function Call & Expression)
; 覆盖: func(arr[5]); | arr[5];
; ------------------------------------------------------------------------------
(compound_statement
  (declaration
    declarator: [
      (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size)
      (init_declarator declarator: (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size))
    ]
  )
  (_)*
  (expression_statement
    (call_expression
      arguments: (argument_list
        (subscript_expression
          argument: (identifier) @use_name
          indices: (subscript_argument_list (number_literal) @use_index)
        ) @target
      )
    )
  )
  (#eq? @def_name @use_name)
)

; ------------------------------------------------------------------------------
; Pattern 3: 控制流与返回 (Control Flow & Return)
; 覆盖: return arr[5]; | if (arr[5] > 0) | while (arr[5])
; ------------------------------------------------------------------------------
(compound_statement
  (declaration
    declarator: [
      (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size)
      (init_declarator declarator: (array_declarator declarator: (identifier) @def_name size: (number_literal) @def_size))
    ]
  )
  (_)*
  [
    (return_statement (subscript_expression argument: (identifier) @use_name indices: (subscript_argument_list (number_literal) @use_index) ) @target )
    (if_statement condition: (condition_clause (binary_expression (subscript_expression argument: (identifier) @use_name indices: (subscript_argument_list (number_literal) @use_index) ) @target )))
    (while_statement condition: (condition_clause (binary_expression (subscript_expression argument: (identifier) @use_name indices: (subscript_argument_list (number_literal) @use_index) ) @target )))
  ]
  (#eq? @def_name @use_name)
)