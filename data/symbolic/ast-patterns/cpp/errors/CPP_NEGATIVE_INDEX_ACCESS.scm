(subscript_expression
  indices:(subscript_argument_list
    (number_literal) @target
  ) 
  (#match? @target "^-")
)
(subscript_expression
  indices:(subscript_argument_list
    (unary_expression) @target
  ) 
  (#match? @target "^-")
)