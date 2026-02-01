/**
 * 符号模型侧 - AST / 源码解析
 *
 * 将源码解析为符号层可用的中间表示（SymbolicIssueRaw），
 * 与 data/symbolic/ast-patterns/cpp/*.scm 及 definitions/cpp-defs.json 对齐。
 */

import type {
  SourceRange,
  SymbolicIssueRaw,
  CppSymbolicRuleId,
} from "@/lib/types/symbolic-types";

export type SupportedSymbolicLanguage = "cpp";

interface CppArrayDeclaration {
  name: string;
  size: number;
  line: number;
  column: number;
}

interface CppArrayAccess {
  name: string;
  index: number;
  line: number;
  column: number;
}

/**
 * 对外主入口：根据语言分发到具体分析实现
 */
export function analyzeSource(
  language: SupportedSymbolicLanguage,
  sourceCode: string,
): SymbolicIssueRaw[] {
  switch (language) {
    case "cpp":
      return analyzeCppSource(sourceCode);
    default:
      return [];
  }
}

/**
 * C++ 源码分析：当前实现基于正则，检测 CPP_ARRAY_OOB_LITERAL（数组下标越界-字面量）。
 * 后续可接入 tree-sitter + ast-patterns/cpp/*.scm，保持本函数签名不变。
 */
export function analyzeCppSource(sourceCode: string): SymbolicIssueRaw[] {
  const lines = sourceCode.split(/\r?\n/);
  const declarations: CppArrayDeclaration[] = [];
  const accesses: CppArrayAccess[] = [];

  const typeKeywords = [
    "int",
    "long",
    "short",
    "char",
    "float",
    "double",
    "bool",
  ];

  const declarationRegex =
    /\b(?:int|long|short|char|float|double|bool)\b(?:\s+\w+)*\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/g;
  const accessRegex = /\b([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/g;

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;

    declarationRegex.lastIndex = 0;
    let declMatch: RegExpExecArray | null;
    while ((declMatch = declarationRegex.exec(lineText)) !== null) {
      const name = declMatch[1];
      const size = Number.parseInt(declMatch[2], 10);
      if (Number.isNaN(size)) continue;
      declarations.push({
        name,
        size,
        line: lineNumber,
        column: declMatch.index + 1,
      });
    }

    accessRegex.lastIndex = 0;
    let accessMatch: RegExpExecArray | null;
    while ((accessMatch = accessRegex.exec(lineText)) !== null) {
      const name = accessMatch[1];
      const indexLiteral = Number.parseInt(accessMatch[2], 10);
      if (Number.isNaN(indexLiteral)) continue;

      const prefix = lineText.slice(0, accessMatch.index);
      const isProbablyDeclaration = typeKeywords.some((keyword) =>
        new RegExp(`\\b${keyword}\\s*$`).test(prefix),
      );
      if (isProbablyDeclaration) continue;

      accesses.push({
        name,
        index: indexLiteral,
        line: lineNumber,
        column: accessMatch.index + 1,
      });
    }
  });

  const issues: SymbolicIssueRaw[] = [];

  for (const access of accesses) {
    const decl = declarations.find((d) => d.name === access.name);
    if (!decl) continue;

    if (access.index >= decl.size) {
      const lineText = lines[access.line - 1] ?? "";
      const ruleId: CppSymbolicRuleId = "CPP_ARRAY_OOB_LITERAL";
      issues.push({
        id: ruleId,
        range: {
          start: { line: access.line, column: access.column },
          end: {
            line: access.line,
            column:
              access.column +
              access.name.length +
              String(access.index).length +
              2,
          },
        },
        snippet: lineText.trim(),
        metadata: {
          arrayName: access.name,
          declaredSize: decl.size,
          accessIndex: access.index,
          declarationLocation: { line: decl.line, column: decl.column },
        },
      });
    }
  }

  return issues;
}
