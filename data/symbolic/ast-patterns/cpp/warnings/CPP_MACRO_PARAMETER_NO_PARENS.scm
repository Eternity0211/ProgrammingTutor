; ==============================================================================
; CPP_MACRO_PARAMETER_NO_PARENS
; 检测带参数的宏定义，提示在展开式中将参数用括号包裹。
; 精确检测需解析 preproc_arg 内容，此处匹配所有带参宏。
; ==============================================================================

(preproc_function_def
  parameters: (preproc_params)
  value: (preproc_arg) @target
)