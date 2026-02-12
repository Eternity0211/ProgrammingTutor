(array_declarator
  size: (number_literal) @target
  (#match? @target "^-")
)
(array_declarator
  size: (unary_expression) @target
  (#match? @target "^-")
)