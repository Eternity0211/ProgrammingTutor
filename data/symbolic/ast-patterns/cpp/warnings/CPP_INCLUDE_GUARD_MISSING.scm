; ==============================================================================
; CPP_INCLUDE_GUARD_MISSING
; 检测文件开头无 #ifndef/#define 或 #pragma once。
; ==============================================================================

(translation_unit) @target
(#not-match? @target "#ifndef|#define|#pragma\\s+once")