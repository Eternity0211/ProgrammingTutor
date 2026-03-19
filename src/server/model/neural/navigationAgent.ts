import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量 (需要根目录下有 .env 文件，内容为 DASHSCOPE_API_KEY=你的key)
dotenv.config();

// 1. 初始化 OpenAI 客户端 (兼容阿里云百炼)
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// ================= 定义数据接口 (Interfaces) =================

// 输入参数接口
export interface NavigatorInputs {
  codeReviewResult: string;
  knowledgeGraph: string;
  studentHistory?: string; // 可选的历史记录
}

// 输出 JSON 的结构定义
export interface RecommendedExercise {
  id: string;
  title: string;
  difficulty: "入门" | "初级" | "中级" | "高级";
  purpose: string;
}

export interface LearningPathStep {
  step: number;
  topic: string;
  duration: string;
  resources: string[];
}

export interface LearningNavigationResult {
  learning_navigation: {
    weaknesses: string[];
    learning_path: LearningPathStep[];
    recommended_exercises: RecommendedExercise[];
  };
}

// ================= 核心业务逻辑 =================

/**
 * 生成 System 和 User Prompt
 */
function buildMessages(
  inputs: NavigatorInputs,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const systemPrompt = `
【角色定义】
你是精准、科学、循序渐进的编程学习导航智能体。根据代码审查中发现的问题，结合知识图谱，为学生规划个性化的学习路径和推荐针对性的练习题目，帮助学生填补知识 gaps，培养良好的编程习惯和工程规范。

【核心目标】
1. 从代码错误中精准定位知识薄弱点和能力短板。
2. 生成清晰、循序渐进的学习路径，符合认知规律。
3. 推荐难度匹配、针对性极强的练习题，巩固所学知识。

【核心任务】
- 能力诊断：从代码审查 issues 归纳薄弱点；结合知识图谱判断缺失；评估水平。
- 学习路径规划：循序渐进（先基础后提升）；明确每个步骤（主题、时长、资源）；拆解目标。
- 练习题推荐：难度匹配；说明训练目的；覆盖多维度。

【行为约束】
- 学习路径不跳跃、不超前、不堆砌。
- 推荐的题目和资源必须与学生的薄弱点高度相关。
- 资源尽量通用、易获取，便于学生实践。
- 结构清晰，学生能直接照着执行。
- 必须且只能输出合法的 JSON 格式。
`;

  const userPrompt = `
请基于以下信息生成学习导航 JSON：

【代码审查结果】
${inputs.codeReviewResult}

【知识图谱】
${inputs.knowledgeGraph}

【学生历史记录】
${inputs.studentHistory || "无"}

【输出格式】
严格遵循以下 JSON 结构，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或解释性文字：
{
  "learning_navigation": {
    "weaknesses": ["知识点1", "知识点2"],
    "learning_path":[
      {
        "step": 1,
        "topic": "学习主题",
        "duration": "建议时长",
        "resources": ["资源名称/链接/章节"]
      }
    ],
    "recommended_exercises":[
      {
        "id": "题目编号",
        "title": "题目名称",
        "difficulty": "入门/初级/中级/高级",
        "purpose": "训练目标和预期收获"
      }
    ]
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
  data: LearningNavigationResult,
  filename: string = "learning_navigation.json",
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
  console.log(`\n✅ 分析结果已保存至：${actualPath}`);
  return actualPath;
}

/**
 * 主函数：调用 API 分析并生成学习路径
 */
export async function generateLearningNavigation(
  inputs: NavigatorInputs,
): Promise<LearningNavigationResult | null> {
  try {
    console.log("正在调用大模型生成学习路径，请稍候...");
    const messages = buildMessages(inputs);

    const completion = await client.chat.completions.create({
      model: "deepseek-v3.2", // 根据百炼平台实际支持的模型名称调整
      messages: messages,
      // 强制要求 JSON 格式输出 (需模型支持，若不支持可在 prompt 中强调，deepseek在百炼平台支持的)
      response_format: { type: "json_object" },
      temperature: 0.3, // 降低随机性，保证 JSON 结构和专业度
    });

    const answerContent = completion.choices[0]?.message?.content;

    if (!answerContent) {
      throw new Error("API 返回内容为空");
    }

    console.log("\n" + "=".repeat(20) + " Token 消耗 " + "=".repeat(20));
    console.log(completion.usage);

    // 解析 JSON
    const parsedData = JSON.parse(answerContent) as LearningNavigationResult;

    // 保存文件
    saveResultToJson(parsedData);

    return parsedData;
  } catch (error) {
    console.error(`❌ 分析失败：`, error);
    return null;
  }
}

// ================= 测试运行 =================
if (process.argv[1] === __filename) {
  // 模拟输入数据
  const mockInputs: NavigatorInputs = {
    codeReviewResult: `
        1. 在 handleData 函数中，存在多层嵌套的 for 循环，时间复杂度达到 O(n^3)。
        2. 变量命名随意，如 let a, b, c; 缺乏语义。
        3. 没有对外部传入的参数进行 null 或 undefined 检查，可能导致 Cannot read property of undefined 报错。
        `,
    knowledgeGraph: `
        - 算法复杂度分析 (前置：基础循环结构；难度：中级)
        - 代码规范与重构 (包含：命名规范、单一职责原则；难度：初级)
        - 防御性编程 (包含：边界条件检查、异常处理；难度：初级)
        `,
    studentHistory:
      "学生最近刚学完 JavaScript 基础语法，能写出简单的功能，但不具备工程化思维。",
  };

  generateLearningNavigation(mockInputs).then((res) => {
    if (res) {
      console.log(
        "\n" + "=".repeat(20) + " 学习导航分析结果 " + "=".repeat(20),
      );
      console.log(JSON.stringify(res, null, 2));
    }
  });
}
