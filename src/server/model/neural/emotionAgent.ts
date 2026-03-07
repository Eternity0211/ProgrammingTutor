import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量 (需要根目录下有 .env 文件，内容为 DASHSCOPE_API_KEY=你的key)
dotenv.config();

// 1. 初始化 OpenAI 客户端 (兼容阿里云百炼)
const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// ================= 定义数据接口 =================

// 输入参数接口
export interface EmotionInputs {
    codeReviewResult: string;          // 代码审查结果（必填）
}
// 输出 JSON 的结构定义
export interface EmotionAnalysisResult {
    emotion_analysis: {
        detected_emotion: string;      // 情绪名称：平静/挫败/焦虑/迷茫/沮丧/自信/成就感等
        intensity: "弱" | "中" | "强"; // 情绪强度
        reason: string;                // 基于代码问题的客观解释
        supportive_guidance: string;   // 简短温暖、有方向、可执行的一段话
    };
}

// ================= 核心业务逻辑 =================

/**
 * 构建 System 和 User Prompt
 */
function buildMessages(inputs: EmotionInputs): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const systemPrompt = `
【角色定义】
你是温和、共情、专业的学习情绪陪伴智能体。你不评判代码好坏，只关注学生的情绪与学习状态，提供安全感、支持感和可执行的小步骤，帮助学生以积极心态面对挑战。

【核心目标】
1. 从代码审查结果精准推断情绪类型和强度。
2. 安抚负面情绪，强化正面情绪，增强学生的学习动力和自信心。
3. 引导学生将注意力从“我不行”转移到“我可以怎么做”，重新建立掌控感。

【核心任务】
1. 情绪识别
   - 依据：代码审查结果中的问题数量、严重程度、错误类型。
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
`;

    const userPrompt = `
请基于以下代码审查结果生成情绪分析 JSON：

【代码审查结果】
${inputs.codeReviewResult}

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
        { role: "user", content: userPrompt }
    ];
}

/**
 * 将分析结果保存到 JSON 文件
 */
function saveResultToJson(data: EmotionAnalysisResult, filename: string = "emotion_analysis.json"): string {
    const resultsDir = path.join(__dirname, "../result");
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // 包含时间戳的文件名，防止覆盖
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const actualFilename = `${timestamp}_${filename}`;
    const actualPath = path.join(resultsDir, actualFilename);

    fs.writeFileSync(actualPath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`\n✅ 情绪分析结果已保存至：${actualPath}`);
    return actualPath;
}

/**
 * 主函数：调用 API 分析情绪并生成支持性指导
 */
export async function generateEmotionalSupport(inputs: EmotionInputs): Promise<EmotionAnalysisResult | null> {
    try {
        console.log("正在调用大模型进行情绪分析，请稍候...");
        const messages = buildMessages(inputs);

        const completion = await client.chat.completions.create({
            model: "deepseek-v3.2",            // 根据实际模型名称调整
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.8,                   // 适度温度，保持语言自然但稳定
        });

        const answerContent = completion.choices[0]?.message?.content;

        if (!answerContent) {
            throw new Error("API 返回内容为空");
        }

        console.log("\n" + "=".repeat(20) + " Token 消耗 " + "=".repeat(20));
        console.log(completion.usage);

        // 解析 JSON
        const parsedData = JSON.parse(answerContent) as EmotionAnalysisResult;

        // 保存文件
        saveResultToJson(parsedData);

        return parsedData;

    } catch (error) {
        console.error(`❌ 情绪分析失败：`, error);
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

    generateEmotionalSupport(mockInputs).then(res => {
        if (res) {
            console.log("\n" + "=".repeat(20) + " 情绪分析结果 " + "=".repeat(20));
            console.log(JSON.stringify(res, null, 2));
        }
    });
}