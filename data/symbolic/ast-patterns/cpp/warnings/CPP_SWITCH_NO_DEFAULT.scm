; ==============================================================================
; CPP_SWITCH_NO_DEFAULT
; 检测缺少 default 分支的 switch 语句。
;
; 约定：
; - @target：整个 switch_statement 节点，用于在 UI 中高亮 switch 关键字附近。
; ==============================================================================

(switch_statement
  body: (compound_statement) @body @target
  ; 若整个 switch 块文本中不包含 "default" 关键字，则认为缺少 default
  (#not-match? @body "\\bdefault\\b")
)

