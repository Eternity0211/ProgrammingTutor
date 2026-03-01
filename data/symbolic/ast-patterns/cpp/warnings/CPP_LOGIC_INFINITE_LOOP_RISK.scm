; ==============================================================================
; CPP_LOGIC_INFINITE_LOOP_RISK
; 启发式：检测 while(true) 或 while(1) 且循环体内无 break/return。
; ==============================================================================

(while_statement
  condition: (condition_clause (parenthesized_expression) @cond)
  body: (compound_statement) @body
) @target
(#match? @cond "\\btrue\\b|\\b1\\b")
(#not-match? @body "\\bbreak\\b|\\breturn\\b|\\bthrow\\b")