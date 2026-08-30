import { DialogueLlmClient } from "../shared/llm-client";
import type {
  ChatMessage,
  DialogueIntent,
  ExtractedEntities,
  IntentRecognitionResult,
} from "../types";

const EMOTION_KEYWORDS = [
  "挫败", "焦虑", "迷茫", "沮丧", "不行", "太难", "放弃", "崩溃",
  "烦躁", "压力", "累", "烦", "气馁", "自信", "成就感", "开心", "兴奋", "满足",
];

const PATH_KEYWORDS = [
  "学习路径", "下一步", "怎么学", "推荐练习", "学习规划",
  "学什么", "学习建议", "练习题", "刷题",
];

const FOLLOWUP_KEYWORDS = [
  "接着", "继续", "刚才", "上次", "那个", "之前", "然后", "还有", "另外", "补充",
];

const KNOWLEDGE_CONCEPTS = [
  "指针", "引用", "内存", "递归", "循环", "数组", "链表", "树", "图",
  "排序", "查找", "动态规划", "贪心", "面向对象", "继承", "多态", "封装",
  "异常", "模板", "STL", "容器", "迭代器", "lambda", "函数", "变量",
  "作用域", "构造", "析构", "虚函数", "纯虚", "友元", "运算符重载",
];

const VALID_INTENTS: DialogueIntent[] = [
  "CODE_SUBMISSION",
  "EMOTIONAL_VENTING",
  "LEARNING_PATH_INQUIRY",
  "KNOWLEDGE_QUESTION",
  "THOUGHT_FOLLOWUP",
];

const SYSTEM_PROMPT = `你是对话意图识别助手，负责分析学生在编程教学平台上的输入意图。

意图类型定义：
1. CODE_SUBMISSION - 提交代码：学生提交了代码片段（通常包含在代码块中），希望获得代码审查、反馈或改进建议。
2. EMOTIONAL_VENTING - 情绪倾诉：学生表达挫败、焦虑、迷茫、沮丧等负面情绪，或表达成就感、自信等正面情绪，需要情感支持和鼓励。
3. LEARNING_PATH_INQUIRY - 追问学习路径：学生询问下一步学什么、推荐练习题、学习规划、学习路径建议。
4. KNOWLEDGE_QUESTION - 普通知识点提问：学生询问某个编程概念、语法、算法等知识点的问题，希望获得知识性解答。
5. THOUGHT_FOLLOWUP - 追问思路：学生基于之前的对话内容继续追问，希望深入讨论之前提到的话题或思路。

判断规则：
- 如果输入包含代码块，优先判断为 CODE_SUBMISSION
- 如果输入表达明显情绪（挫败/焦虑/太难/放弃等），判断为 EMOTIONAL_VENTING
- 如果输入询问学习规划/推荐/下一步，判断为 LEARNING_PATH_INQUIRY
- 如果输入引用了之前的对话内容（接着/继续/刚才/上次），判断为 THOUGHT_FOLLOWUP
- 其他情况判断为 KNOWLEDGE_QUESTION

请返回严格的 JSON 格式，不要输出任何额外的 Markdown 标记或解释性文字：
{
  "intent": "CODE_SUBMISSION|EMOTIONAL_VENTING|LEARNING_PATH_INQUIRY|KNOWLEDGE_QUESTION|THOUGHT_FOLLOWUP",
  "confidence": 0.0到1.0的数字,
  "entities": {
    "codeSnippet": "提取的代码片段内容（无则为空字符串）",
    "language": "编程语言如cpp/python/java（无则为空字符串）",
    "knowledgeKeywords": ["知识点关键词数组"],
    "emotionKeywords": ["情绪关键词数组"],
    "referencedTopic": "引用的之前话题（无则为空字符串）"
  }
}`;

export class IntentRecognizer {
  private llm: DialogueLlmClient;

  constructor(llm?: DialogueLlmClient) {
    this.llm = llm ?? DialogueLlmClient.getInstance();
  }

  async recognize(
    message: string,
    context?: ChatMessage[],
  ): Promise<IntentRecognitionResult> {
    try {
      return await this.recognizeWithLlm(message, context);
    } catch (error) {
      console.warn("[IntentRecognizer] LLM failed, using fallback:", error);
      return this.fallbackRecognize(message, context);
    }
  }

  private async recognizeWithLlm(
    message: string,
    context?: ChatMessage[],
  ): Promise<IntentRecognitionResult> {
    const userPrompt = this.buildUserPrompt(message, context);

    const content = await this.llm.chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      jsonMode: true,
      temperature: 0.1,
    });

    return this.parseResult(content, message);
  }

  private buildUserPrompt(message: string, context?: ChatMessage[]): string {
    let prompt = `请分析以下学生输入的意图：\n\n学生输入：${message}`;

    if (context && context.length > 0) {
      const recentContext = context.slice(-5);
      const contextText = recentContext
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      prompt += `\n\n近期对话上下文：\n${contextText}`;
    }

    return prompt;
  }

  private parseResult(
    content: string,
    rawText: string,
  ): IntentRecognitionResult {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return this.fallbackRecognize(rawText);
    }

    const intent = VALID_INTENTS.includes(parsed.intent as DialogueIntent)
      ? (parsed.intent as DialogueIntent)
      : "KNOWLEDGE_QUESTION";

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    const entities = this.parseEntities(parsed.entities);

    return { intent, confidence, entities, rawText };
  }

  private parseEntities(raw: unknown): ExtractedEntities {
    if (!raw || typeof raw !== "object") {
      return {};
    }

    const obj = raw as Record<string, unknown>;
    const entities: ExtractedEntities = {};

    if (typeof obj.codeSnippet === "string" && obj.codeSnippet) {
      entities.codeSnippet = obj.codeSnippet;
    }
    if (typeof obj.language === "string" && obj.language) {
      entities.language = obj.language;
    }
    if (Array.isArray(obj.knowledgeKeywords) && obj.knowledgeKeywords.length > 0) {
      entities.knowledgeKeywords = obj.knowledgeKeywords.filter(
        (k): k is string => typeof k === "string",
      );
    }
    if (Array.isArray(obj.emotionKeywords) && obj.emotionKeywords.length > 0) {
      entities.emotionKeywords = obj.emotionKeywords.filter(
        (k): k is string => typeof k === "string",
      );
    }
    if (typeof obj.referencedTopic === "string" && obj.referencedTopic) {
      entities.referencedTopic = obj.referencedTopic;
    }

    return entities;
  }

  private fallbackRecognize(
    message: string,
    context?: ChatMessage[],
  ): IntentRecognitionResult {
    const entities = this.extractEntitiesFallback(message);

    let intent: DialogueIntent = "KNOWLEDGE_QUESTION";

    if (entities.codeSnippet) {
      intent = "CODE_SUBMISSION";
    } else if (this.matchAny(message, EMOTION_KEYWORDS)) {
      intent = "EMOTIONAL_VENTING";
    } else if (this.matchAny(message, PATH_KEYWORDS)) {
      intent = "LEARNING_PATH_INQUIRY";
    } else if (
      this.matchAny(message, FOLLOWUP_KEYWORDS) &&
      context &&
      context.length > 0
    ) {
      intent = "THOUGHT_FOLLOWUP";
    }

    return {
      intent,
      confidence: 0.5,
      entities,
      rawText: message,
    };
  }

  private extractEntitiesFallback(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    const codeMatch = message.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      entities.codeSnippet = codeMatch[1].trim();
    }

    const langMatch = message.match(/```(\w+)/);
    if (langMatch) {
      entities.language = langMatch[1];
    }

    const emotionKeywords = EMOTION_KEYWORDS.filter((kw) =>
      message.includes(kw),
    );
    if (emotionKeywords.length > 0) {
      entities.emotionKeywords = emotionKeywords;
    }

    const knowledgeKeywords = KNOWLEDGE_CONCEPTS.filter((kw) =>
      message.includes(kw),
    );
    if (knowledgeKeywords.length > 0) {
      entities.knowledgeKeywords = knowledgeKeywords;
    }

    return entities;
  }

  private matchAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}
