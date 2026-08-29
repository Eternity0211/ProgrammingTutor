# API_Agent技术文档

## 0. 前置准备与本地自测

### 在运行之前，请确保你已经安装了相关的依赖：

```bash
npm install openai dotenv
npm install -D typescript @types/node
```

### 测试运行API流程

1. 访问阿里云百炼平台，获取自己的API-Key并配置在系统环境中
2. 在model/neural下创建.env文件中，写入

```text
DASHSCOPE_API_KEY修改为自己的API-Key
```

3. 运行一下命令行完成测试（代码中已预留自测板块）

```bash
npx ts-node navigationAgent.ts
npx ts-node emotionAgent.ts
npx ts-node navigationAgent.ts
```

### 注意事项

1. **环境变量**：运行前确保注入了 `DASHSCOPE_API_KEY`，并在代码中确认 `baseURL` 对应你使用的服务商。
2. **JSON 解析异常处理**：由于使用的是 LLM 直接生成结果，存在极低概率的 JSON 格式破损。代码中已包含基础的 `JSON.parse` 错误捕获 (`catch`)。
3. **响应格式**：已通过 `response_format: { type: "json_object" }` 强制要求模型返回 JSON。使用此特性时，Prompt 中必须明确包含要求输出 JSON 的指令。

---

## 1. 编程学习导航智能体 (navigationAgent) 接口文档

### a. 接口概述

本接口封装了 OpenAI 兼容的 LLM API（如阿里云百炼 deepseek 模型）。通过输入学生的代码审查结果（Code Review）、知识图谱以及历史学习记录，智能体将自动进行能力诊断，并输出一段结构化的 JSON 学习导航（包含薄弱点、学习路径和推荐练习）。

### b. 核心函数

`generateLearningNavigation(inputs: NavigatorInputs): Promise<LearningNavigationResult | null>`

### c. 请求参数 (NavigatorInputs)

传递给函数的参数为一个包含以下字段的 Object：

| 参数名             | 类型     | 必填 | 描述                                                     |
| :----------------- | :------- | :--: | :------------------------------------------------------- |
| `codeReviewResult` | `string` |  是  | 代码审查的详细结果或发现的 issues 列表。                 |
| `knowledgeGraph`   | `string` |  是  | 相关的知识图谱描述（包含知识点、前置关系、难度等级等）。 |
| `studentHistory`   | `string` |  否  | 学生的历史学习记录和题目完成情况，帮助模型调整推荐难度。 |

### d. 返回结果 (LearningNavigationResult)

函数返回一个 Promise，解析后为一个严格符合以下结构的 JSON Object。如果生成失败或解析出错，将返回 `null`。

| 字段结构路径                                | 类型            | 描述                               |
| :------------------------------------------ | :-------------- | :--------------------------------- |
| `learning_navigation`                       | `Object`        | 导航结果的根节点                   |
| `learning_navigation.weaknesses`            | `Array<string>` | 从代码中归纳出的知识薄弱点列表     |
| `learning_navigation.learning_path`         | `Array<Object>` | 学习路径规划列表，按顺序排列       |
| `...learning_path[].step`                   | `number`        | 步骤序号（如 1, 2, 3）             |
| `...learning_path[].topic`                  | `string`        | 本步骤的学习主题                   |
| `...learning_path[].duration`               | `string`        | 建议学习时长（如 "2小时", "3天"）  |
| `...learning_path[].resources`              | `Array<string>` | 推荐学习资源或链接                 |
| `learning_navigation.recommended_exercises` | `Array<Object>` | 推荐练习题列表                     |
| `...recommended_exercises[].id`             | `string`        | 题目编号                           |
| `...recommended_exercises[].title`          | `string`        | 题目名称                           |
| `...recommended_exercises[].difficulty`     | `string`        | 难度限定："入门""初级""中级""高级" |
| `...recommended_exercises[].purpose`        | `string`        | 训练目标和预期收获说明             |

## e. 返回结果 JSON 示例

```json
{
  "learning_navigation": {
    "weaknesses": ["算法复杂度分析", "代码规范与重构", "防御性编程"],
    "learning_path": [
      {
        "step": 1,
        "topic": "代码规范与重构（变量命名与函数职责）",
        "duration": "2-3小时",
        "resources": [
          "《代码整洁之道》第2章（命名）",
          "MDN Web Docs - JavaScript 编码规范",
          "理解单一职责原则（SRP）的简单示例"
        ]
      },
      {
        "step": 2,
        "topic": "防御性编程（参数校验与边界条件）",
        "duration": "2-3小时",
        "resources": [
          "MDN Web Docs - 可选链操作符（?.）和空值合并操作符（??）",
          "JavaScript 中常见的边界条件检查实践",
          "使用条件判断进行简单的输入验证"
        ]
      },
      {
        "step": 3,
        "topic": "算法复杂度分析基础（时间复杂度）",
        "duration": "3-4小时",
        "resources": [
          "《算法图解》第1章（算法简介）",
          "理解大O表示法（Big O Notation）的入门教程",
          "分析常见循环结构（单层、双层嵌套）的时间复杂度"
        ]
      }
    ],
    "recommended_exercises": [
      {
        "id": "EX001",
        "title": "重构变量命名与简化函数",
        "difficulty": "初级",
        "purpose": "将一段使用a, b, c等无意义变量名且功能混杂的代码，重命名为有语义的变量，并将一个过长函数拆分为多个单一职责的小函数。"
      },
      {
        "id": "EX002",
        "title": "为数据处理函数添加防御性检查",
        "difficulty": "初级",
        "purpose": "给定一个处理数组的函数，为其添加对输入参数是否为数组、是否为空、元素是否存在的检查，并使用默认值或优雅退出的逻辑。"
      },
      {
        "id": "EX003",
        "title": "识别并优化嵌套循环",
        "difficulty": "中级",
        "purpose": "分析一个具有三层嵌套循环的示例代码的时间复杂度，并尝试使用更高效的数据结构（如对象/Map）来减少一层循环，将复杂度从O(n^3)降至O(n^2)。"
      }
    ]
  }
}
```

---

## 2. 情绪学习陪伴智能体 (emotionAgent) 接口文档

### a. 接口概述

本接口封装了 OpenAI 兼容的 LLM API（如阿里云百炼 deepseek 模型）。通过输入代码审查结果（Code Review），智能体将自动进行情绪识别，并输出一段结构化的 JSON 情绪分析（包含情绪类型、强度、原因和支持性指导语），旨在为学生提供共情、温暖、可执行的心理支持，帮助其保持积极的学习心态。

### b. 核心函数

`generateEmotionalSupport(inputs: EmotionInputs): Promise<EmotionAnalysisResult | null>`

### c. 请求参数 (EmotionInputs)

传递给函数的参数为一个包含以下字段的 Object：

| 参数名             | 类型     | 必填 | 描述                                     |
| :----------------- | :------- | :--: | :--------------------------------------- |
| `codeReviewResult` | `string` |  是  | 代码审查的详细结果或发现的 issues 列表。 |

### d. 返回结果 (EmotionAnalysisResult)

函数返回一个 Promise，解析后为一个严格符合以下结构的 JSON Object。如果生成失败或解析出错，将返回 `null`。

| 字段结构路径                           | 类型     | 描述                                                                |
| :------------------------------------- | :------- | :------------------------------------------------------------------ |
| `emotion_analysis`                     | `Object` | 情绪分析结果的根节点                                                |
| `emotion_analysis.detected_emotion`    | `string` | 检测到的情绪名称，可选范围：平静/挫败/焦虑/迷茫/沮丧/自信/成就感 等 |
| `emotion_analysis.intensity`           | `string` | 情绪强度，限定为："弱""中""强"                                      |
| `emotion_analysis.reason`              | `string` | 基于代码问题给出的客观、不评判的原因解释                            |
| `emotion_analysis.supportive_guidance` | `string` | 基于代码问题给出的客观、不评判的原因解释                            |

## e. 返回结果 JSON 示例

```json
{
  "emotion_analysis": {
    "detected_emotion": "挫败",
    "intensity": "中",
    "reason": "代码审查指出了多个维度的基础性问题，包括健壮性、可读性、性能和代码结构，这表明当前实现与预期目标存在较大差距，容易让人感到努力受挫。",
    "supportive_guidance": "一下子面对这么多反馈确实会让人有点不知所措，这很正常，说明你正在接触真实项目中复杂的部分。我们先从最容易获得掌控感的地方开始：选一个你看着最不顺眼的变量名，比如‘tmp’，花一分钟为它想一个能清晰表达用途的新名字。完成这一个小改变，我们就向前迈出了一步。"
  }
}
```
