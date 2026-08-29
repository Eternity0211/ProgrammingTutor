; ==============================================================================
; CPP_LOGIC_GLOBAL_VARIABLE_ABUSE
; 检测 translation_unit 顶层的变量声明（文件作用域全局变量）。
; 滥用全局变量增加耦合，降低可测试性。
; ==============================================================================

(translation_unit
  (declaration
    declarator: (init_declarator) @target
  )
)