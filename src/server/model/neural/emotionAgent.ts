import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import {
  createLlmClient,
  getLlmModel,
} from "@/server/model/shared/llm-provider";
import { recordLlmUsage } from "@/server/model/shared/llm-usage-recorder";
import {
  AgentOutputValidationError,
  emotionAgentEnvelopeSchema,
} from "@/server/model/dialogue/types/agent-results";
import { recordAgentOutputValidation } from "@/server/observability/metrics";
import { recordPromptInvocation } from "@/server/observability/metrics";
import {
  getPromptDefinition,
  promptContractHeader,
} from "@/server/model/prompts/registry";
import { extractEvidenceTags, validateGroundedStatements } from "./agent-grounding";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量 (需要根目录下有 .env 文件，内容为 DEEPSEEK_API_KEY=你的key)
dotenv.config();

// 1. 延迟初始化 DeepSeek OpenAI-compatible 客户端
let client: ReturnType<typeof createLlmClient> | null = null;

function getClient(): ReturnType<typeof createLlmClient> {
  if (!client) {
    client = createLlmClient();
  }
  return client;
}

// ================= 定义数据接口 =================

// 输入参数接口
export interface EmotionInputs {
  codeReviewResult?: string;
  studentProfileSummary?: string;
  sessionContext?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
// 输出 JSON 的结构定义
export interface EmotionAnalysisResult {
  emotion_analysis: {
    detected_emotion: string; // 情绪名称：平静/挫败/焦虑/迷茫/沮丧/自信/成就感等
    intensity: "弱" | "中" | "强"; // 情绪强度
    reason: string; // 基于代码问题的客观解释
    supportive_guidance: string; // 简短温暖、有方向、可执行的一段话
  };
}

// ================= 核心业务逻辑 =================

/**
 * 构建 System 和 User Prompt
 */
function buildMessages(
  inputs: EmotionInputs,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const systemPrompt = `${promptContractHeader("agent.emotion-support")}
【角色定义】
你是温和、共情、专业的学习情绪陪伴智能体。你不评判代码好坏，只关注学生的情绪与学习状态，提供安全感、支持感和可执行的小步骤，帮助学生以积极心态面对挑战。

【核心目标】
1. 综合代码审查、学生画像和近期对话判断学习状态；代码提交场景以代码审查为主要依据。
2. 安抚负面情绪，强化正面情绪，增强学生的学习动力和自信心。
3. 引导学生将注意力从“我不行”转移到“我可以怎么做”，重新建立掌控感。

【核心任务】
1. 情绪识别
   - 证据权重：代码审查 60%，近期对话 25%，学生画像 15%。缺失来源不臆造，其权重按比例分配给已有来源。
   - 对话中学生明确表达的情绪优先于间接推断；代码错误只能说明学习压力，不能证明学生一定具有某种情绪。
   - 情绪类型：平静/挫败/焦虑/迷茫/沮丧/自信/成就感。
   - 强度：弱/中/强。
2. 情感支持
   - 先共情，再给方向，不给空洞安慰。
   - 语言温暖、简短、有力量，肯定学生的努力。
   - 给出最小可执行步骤，帮助学生恢复掌控感。
3. 输出指导
   - 指导语必须与审查结果强相关，具体、可执行。
   - 不说教、不批评、不对比，避免加剧负面情绪。

【行为约束】
- 绝对不使用“你怎么错这么多”“太不认真”等指责语言。
- guidance 必须包含一个当下就能做的小行动。
- 语气像耐心的学习伙伴，不是老师。
- 不制造焦虑，不夸大问题。
- reason 必须明确引用可用证据标签：[REVIEW]、[PROFILE] 或 [DIALOGUE]；代码错误不能单独证明负面情绪。
- 不得补充学生没有表达过的心理状态、经历或能力判断。
`;

  const userPrompt = `
请基于以下现有证据生成情绪分析 JSON：

【代码审查结果 [REVIEW]】
${inputs.codeReviewResult || "本次没有代码审查证据"}

【学生画像 [PROFILE]】
${inputs.studentProfileSummary || "本次没有学生画像证据"}

【近期对话 [DIALOGUE]】
${inputs.sessionContext?.map((message) => `${message.role}: ${message.content}`).join("\n") || "本次没有近期对话证据"}

【输出格式】
严格遵循以下 JSON 结构，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或解释性文字：
{
  "emotion_analysis": {
    "detected_emotion": "情绪名称",
    "intensity": "弱/中/强",
    "reason": "基于代码问题的客观解释",
    "supportive_guidance": "简短温暖、有方向、可执行的一段话"
  }
}
`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

/**
 * 将分析结果保存到 JSON 文件
 */
function saveResultToJson(
  data: EmotionAnalysisResult,
  filename: string = "emotion_analysis.json",
): string {
  const resultsDir = path.join(__dirname, "../result");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // 包含时间戳的文件名，防止覆盖
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const actualFilename = `${timestamp}_${filename}`;
  const actualPath = path.join(resultsDir, actualFilename);

  fs.writeFileSync(actualPath, JSON.stringify(data, null, 4), "utf-8");
  console.log(`\n✅ 情绪分析结果已保存至：${actualPath}`);
  return actualPath;
}

/**
 * 主函数：调用 API 分析情绪并生成支持性指导
 */
export async function generateEmotionalSupport(
  inputs: EmotionInputs,
): Promise<EmotionAnalysisResult | null> {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn("⚠️  DEEPSEEK_API_KEY not set, skipping emotion analysis");
      recordAgentOutputValidation("emotion", "unavailable");
      return null;
    }

    console.log("正在调用大模型进行情绪分析，请稍候...");
    const messages = buildMessages(inputs);
    const prompt = getPromptDefinition("agent.emotion-support");
    recordPromptInvocation(prompt.id, prompt.version);

    const allowedEvidenceTags = new Set<string>();
    if (inputs.codeReviewResult) {
      allowedEvidenceTags.add("REVIEW");
      for (const tag of extractEvidenceTags(inputs.codeReviewResult)) {
        allowedEvidenceTags.add(tag);
      }
    }
    if (inputs.studentProfileSummary) allowedEvidenceTags.add("PROFILE");
    if (inputs.sessionContext?.length) allowedEvidenceTags.add("DIALOGUE");
    let parsedData: EmotionAnalysisResult | null = null;
    let validationDetails = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptMessages = [...messages];
      if (validationDetails) {
        attemptMessages.push({
          role: "user",
          content: `上一版输出未通过校验：${validationDetails}。请重新输出完整 JSON，保留 detected_emotion、intensity、reason、supportive_guidance 四个字段，并让 reason 引用可用证据标签。`,
        });
      }
      const completion = await getClient().chat.completions.create({
        model: getLlmModel(),
        messages: attemptMessages,
        response_format: { type: "json_object" },
        temperature: attempt === 0 ? 0.2 : 0.1,
      });
      recordLlmUsage(completion.usage, {
        agent: "emotion",
        model: getLlmModel(),
      });

      const answerContent = completion.choices[0]?.message?.content;
      if (!answerContent) {
        validationDetails = "API 返回内容为空";
        continue;
      }
      try {
        const parsed = emotionAgentEnvelopeSchema.safeParse(
          JSON.parse(answerContent),
        );
        if (!parsed.success) {
          validationDetails = parsed.error.message;
          continue;
        }
        const groundingIssues = validateGroundedStatements(
          [parsed.data.emotion_analysis.reason],
          allowedEvidenceTags,
        );
        if (groundingIssues.length > 0) {
          validationDetails = groundingIssues.join("; ");
          continue;
        }
        parsedData = parsed.data;
        break;
      } catch (error) {
        validationDetails =
          error instanceof Error ? error.message : "无法解析 JSON";
      }
    }

    if (!parsedData) {
      recordAgentOutputValidation("emotion", "invalid");
      throw new AgentOutputValidationError(
        "EmotionAgent",
        validationDetails || "模型输出未通过证据校验",
      );
    }
    recordAgentOutputValidation("emotion", "valid");

    // 保存文件
    if (process.env.EVAL_DISABLE_AGENT_ARTIFACTS !== "1") {
      saveResultToJson(parsedData);
    }

    return parsedData;
  } catch (error) {
    console.error(`❌ 情绪分析失败：`, error);
    if (!(error instanceof AgentOutputValidationError)) {
      recordAgentOutputValidation("emotion", "unavailable");
    }
    return null;
  }
}

// ================= 测试运行 =================
if (process.argv[1] === __filename) {
  // 模拟代码审查结果
  const mockInputs: EmotionInputs = {
    codeReviewResult: `
        代码中存在大量未处理的边界情况，例如当输入为空时直接报错；
        函数命名混乱，变量名多为 a, b, tmp，无法理解其含义；
        存在三层嵌套循环，性能极低且逻辑复杂难懂；
        多处重复代码，未提取公共函数。
        `,
  };

  generateEmotionalSupport(mockInputs).then((res) => {
    if (res) {
      console.log("\n" + "=".repeat(20) + " 情绪分析结果 " + "=".repeat(20));
      console.log(JSON.stringify(res, null, 2));
    }
  });
}
