; ==============================================================================
; CPP_FUNCTION_PARAMETER_DEFAULT_VALUE_NOT_LAST
; 检测默认参数出现在非默认参数之前。C++ 要求默认参数必须连续出现在参数列表末尾。
; 启发式：参数列表中，带 default_value 的 parameter_declaration 后仍有不带 default 的。
; 简化：匹配 parameter_list 中 default_value 后仍有 parameter_declaration 的模式。
; ==============================================================================

; 匹配声明中 default_value 后跟更多参数（通过文本启发式）
(parameter_list) @target
(#match? @target "=\\s*[^,)]+\\s*,\\s*[^=]+\\s+\\w+\\s*[),]")