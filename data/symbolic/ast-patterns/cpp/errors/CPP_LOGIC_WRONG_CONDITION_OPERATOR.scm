; ==============================================================================
; CPP_LOGIC_WRONG_CONDITION_OPERATOR
; 检测条件中误用 & 或 | 而非 && 或 ||，导致短路求值失效。
; 注意：CPP_ASSIGNMENT_IN_IF 已覆盖 = 误用为 == 的情况。
; ==============================================================================

; 条件中单独使用 & （按位与，非逻辑与）
(if_statement
  condition: (condition_clause
    (binary_expression
      operator: ["&" "|"]
    ) @target
  )
)

; while 条件中
(while_statement
  condition: (condition_clause
    (binary_expression
      operator: ["&" "|"]
    ) @target
  )
)
