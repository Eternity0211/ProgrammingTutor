(declaration
    declarator: (array_declarator
        declarator: (identifier) @def_name
        size: (number_literal) @def_size
    )
)

(subscript_expression
    argument: (identifier) @use_name
    indices: (subscript_argument_list
        (number_literal) @use_index
    )
) @target

(#eq? @def_name @use_name) 