; ==============================================================================
; CPP_VAR_NAMING
; 检测过短的局部变量命名（单字母），但保留常见循环变量 i/j/k/x/y/z。
; 仅在变量声明场景中触发，避免误报类型名、函数名等。
; 约定：
; - @target：用于定位高亮的标识符节点
; - @name  ：同一节点文本，供 JSON message 中的 {name} 插值
; ==============================================================================

; 1. 带初始化的变量声明
;    示例：
;      int a = 0;   // 命中（a 过短）
;      int i = 0;   // 不命中（常见循环变量）
(declaration
  declarator: (init_declarator
    declarator: (identifier) @target @name
  )
  ; 只匹配单字母名称
  (#match? @name "^[A-Za-z]$")
  ; 排除常见的循环/数学变量：i, j, k, x, y, z（含大小写）
  (#not-match? @name "^[ijkxyzIJKXYZ]$")
)

; 2. 不带初始化的变量声明
;    示例：
;      int a;       // 命中
;      int x;       // 不命中
(declaration
  declarator: (identifier) @target @name
  (#match? @name "^[A-Za-z]$")
  (#not-match? @name "^[ijkxyzIJKXYZ]$")
)

