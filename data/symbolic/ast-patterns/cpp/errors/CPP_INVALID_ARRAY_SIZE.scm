(array_declarator
  size: (number_literal) @target @size
  (#match? @target "^-")
)
(array_declarator
  size: (unary_expression) @target @size
  (#match? @target "^-")
)