(subscript_expression
  indices:(subscript_argument_list
    (number_literal) @target @index
  ) 
  (#match? @target "^-")
)
(subscript_expression
  indices:(subscript_argument_list
    (unary_expression) @target @index
  ) 
  (#match? @target "^-")
)