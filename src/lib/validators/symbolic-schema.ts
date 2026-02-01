import { z } from "zod";

/**
 * 符号规则校验器
 *
 * 确保任何新增的 C++ 诊断规则都包含 display_name、severity、pedagogical_label 等字段，
 * 与 data/symbolic/definitions/cpp-defs.json 结构一致。
 */

const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;

/** 单条符号定义 Schema：与 cpp-defs.json 中每条规则结构一致 */
export const symbolicDefinitionSchema = z.object({
  display_name: z.string().min(1, "display_name 必填"),
  pedagogical_label: z.string().min(1, "pedagogical_label 必填"),
  knowledge_concept: z.string().min(1, "knowledge_concept 必填"),
  severity: z.enum(SEVERITIES, {
    errorMap: () => ({ message: "severity 须为 Critical | High | Medium | Low" }),
  }),
  description: z.string().min(1, "description 必填"),
});

export type SymbolicDefinitionSchema = z.infer<typeof symbolicDefinitionSchema>;

/** definitions 文件 Schema：key 为规则 ID，value 为单条定义 */
export const symbolicDefinitionsFileSchema = z.object({
  definitions: z.record(z.string(), symbolicDefinitionSchema),
});

export type SymbolicDefinitionsFileSchema = z.infer<
  typeof symbolicDefinitionsFileSchema
>;

/**
 * 校验单条规则对象是否合法（新增规则或从 JSON 加载后可用）
 */
export function validateSymbolicDefinition(
  data: unknown,
): z.SafeParseReturnType<unknown, SymbolicDefinitionSchema> {
  return symbolicDefinitionSchema.safeParse(data);
}

/**
 * 校验完整 definitions 文件（如 cpp-defs.json 解析结果）
 */
export function validateSymbolicDefinitionsFile(
  data: unknown,
): z.SafeParseReturnType<unknown, SymbolicDefinitionsFileSchema> {
  return symbolicDefinitionsFileSchema.safeParse(data);
}
