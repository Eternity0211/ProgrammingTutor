; ==============================================================================
; CPP_NAMESPACE_USING_IN_HEADER
; 检测全局作用域中使用 `using namespace` 的语句，例如：
;   using namespace std;
;
; 虽然无法在 AST 模式中直接区分 .h/.cpp 文件，这里仍将该模式作为
; 一般性的“using namespace” 使用风险提示。
;
; 约定：
; - @target：整条声明，用于高亮
; ==============================================================================

(declaration) @target
(#match? @target "\\busing\\s+namespace\\b")

