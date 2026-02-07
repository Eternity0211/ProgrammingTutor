/**
 * 符号模型侧 - 规则库比对
 *
 * 将 analyzer 产出的 SymbolicIssueRaw 映射到 definitions/cpp-defs.json，
 * 输出带教学信息的 SymbolicIssue，供 UI 与神经侧使用。
 */

import type {
  SymbolicIssueRaw,
  SymbolicIssue,
  SymbolicDefinition,
} from "@/lib/types/symbolic-types";
import { validateSymbolicDefinitionsFile } from "@/lib/validators/symbolic-schema";

import cppDefinitionsJson from "../../../../data/symbolic/definitions/cpp-defs.json";

const parsed = validateSymbolicDefinitionsFile(cppDefinitionsJson as unknown);
if (!parsed.success) {
  throw new Error(
    `cpp-defs.json 校验失败: ${JSON.stringify(parsed.error.flatten())}`,
  );
}
const cppDefinitions: Record<string, SymbolicDefinition> =
  parsed.data.definitions;

/**
 * 将符号原始发现映射为带定义的告警；未在 cpp-defs 中注册的 ruleId 会被跳过。
 */
export function mapCppIssues(issues: SymbolicIssueRaw[]): SymbolicIssue[] {
  const result: SymbolicIssue[] = [];
  for (const issue of issues) {
    const definition = cppDefinitions[issue.id];
    if (!definition) continue;
    const mapped: SymbolicIssue = {
      id: issue.id,
      range: issue.range,
      snippet: issue.snippet,
      ...(issue.metadata != null ? { metadata: issue.metadata } : {}),
      definition,
    };
    result.push(mapped);
  }
  return result;
}
