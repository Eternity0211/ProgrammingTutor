# C++ 符号分析规则扩增指南

本指南旨在指导扩展 C++ 符号分析引擎的检测规则。该引擎采用 **SCM (检测逻辑)** 与 **JSON (教学内容)** 分离的架构。

---

## 第一部分：技术指南 (Technical Guidelines)

新增一条规则通常只需要添加两个文件（.scm 和 .json），无需修改 TypeScript 代码（除非涉及复杂数值逻辑）。

### 1. 核心流程概览

1. **定义模式 (.scm)**: 在 `ast-patterns` 中编写 Tree-sitter 查询语句，捕获代码节点。
2. **定义元数据 (.json)**: 在 `definitions` 中编写富文本信息（报错信息、修复建议、知识点）。
3. **关联机制**: SCM 文件名必须与 JSON 中的 Key 完全一致 (即 **Rule ID**)。

### 2. Step 1: 编写富文本定义 (JSON)

#### 2.1 文件位置

- **Errors**: `data/symbolic/definitions/cpp-errors.json`
- **Warnings**: `data/symbolic/definitions/cpp-warnings.json`

#### 2.2 配置字段说明

在 `definitions` 对象中添加与 SCM 文件名对应的 Key。
【目前只对`message`支持 `{name}` 语法，如果其他需要，联系我，我来扩展】

| 字段                | 类型   | 说明                                              | 插值示例                                             |
| ------------------- | ------ | ------------------------------------------------- | ---------------------------------------------------- |
| **Key**             | string | **必须与 .scm 文件名一致**                        | `"CPP_EMPTY_WHILE"`                                  |
| `severity`          | string | 严重程度: "High", "Medium", "Low"                 | -                                                    |
| `display_name`      | string | 短标题，用于列表展示                              | `"Empty Loop Body"`                                  |
| `message`           | string | 详细描述。支持 `{name}` 语法，对应 SCM 中的捕获名 | `"While loop condition '{cond}' has an empty body."` |
| `pedagogical_label` | string | 教学标签                                          | `"Control Flow"`                                     |
| `knowledge_concept` | string | 关联知识点 ID                                     | `"Loops"`                                            |
| `remediation`       | string | 文字修复建议                                      | `"Remove the loop or add logic."`                    |
| `remediation_code`  | string | (可选) 代码修复示例                               | -                                                    |

### 3. Step 2: 编写 SCM 模式匹配规则

#### 3.1 目录位置

- **Errors**: `data/symbolic/ast-patterns/cpp/errors/`
- **Warnings**: `data/symbolic/ast-patterns/cpp/warnings/`

#### 3.2 文件命名

- 格式: `Rule_ID.scm`
- 示例: `CPP_EMPTY_WHILE.scm`

#### 3.3 编写规范

使用 Tree-sitter S-expression 查询 AST。必须遵守以下捕获命名约定：

- **`@target` (必须)**: 标记整个问题节点。这是 UI 高亮显示的范围。
- **`@variable_name` (可选)**: 捕获特定子节点的内容（如变量名、数值），用于传递给 JSON 模板进行插值。

### 4. Step 3: 高级逻辑验证 (可选)

如果规则无法单纯通过 SCM 的正则匹配完成（例如：比较两个捕获节点的数值大小 `index >= size`），则需要修改 TypeScript 代码。

#### 4.1 操作步骤

1. 修改文件: `src/server/model/symbolic/static/errors.ts`
2. 找到 `VALIDATORS` 常量对象。
3. 添加与 Rule ID 对应的验证函数。

#### 4.2 返回值说明

- `null`: 验证通过（不存在该错误）。
- `"__no_message__"`: 验证失败（存在该错误），使用 JSON 中的默认 message。
- `"Error string..."`: 验证失败（存在该错误），覆盖 JSON 中的 message（适用于 message 需要动态计算的情况）。

### 5. 调试与测试指南

1. **开发工具**: 推荐使用 [Tree-sitter Playground](https://www.google.com/search?q=https://tree-sitter.github.io/tree-sitter/playground) 在线调试。语言选 C++，输入代码尝试编写 Query。
2. **本地验证**: 在 `\tests\server\model\symbolic\symbolic.ts` 中构造包含特定类型错误的代码段进行测试。
3. **常见陷阱**:

- **Rule ID 不匹配**: JSON Key 与 SCM 文件名必须完全一致（大小写敏感）。
- **SCM 捕获失效**: 确保 `@target` 存在。如果语法错误，控制台会输出 `Failed to compile SCM rule`。
- **JSON 格式**: 必须是标准 JSON（双引号，无尾随逗号）。

---

## 第二部分：思路指南 (Strategy Guidelines)

本部分提供了扩充规则库的理论依据和分类策略，所有规则均要求**能通过静态分析检测出**。

### 1. 扩充策略体系

#### 1.1 Errors (错误)

- **定义**: 编译器通常能通过，但在运行时会导致崩溃、未定义行为（UB）或严重逻辑错误的缺陷。
- **分析方法**: 采用 **对象（Object）× 行为（Behavior）** 的正交分析法。

#### 1.2 Warnings (警告/建议)

采用 **覆盖全生命周期** 的静态分析体系：

- **编写时 (Writing)**

1. **现代化**: 检测“上古时代”的 C++ 写法，引导用户使用 C++11/14/17/20 新特性。
2. **可读性与认知复杂度**: 降低代码理解难度。

- **编译/设计时 (Designing)**

3.  **接口契约与 API 设计**: 规范接口使用，防止误用。
4.  **命名空间与全局污染**: 管理作用域，避免冲突。

- **运行时 (Running)**

5.  **性能微调**: 捕捉无需运行时分析即可发现的低效写法。
6.  **并发安全基础**: 预防基础的线程安全问题。

- **维护时 (Maintaining)**

7.  **防御性编程**: 消除逻辑正确但存在隐患的写法。
8.  **技术债与代码卫生**: 清理遗留代码和不良习惯。

### 2. 理论基石：四大权威准则 (The Four Pillars)

用于编写 `message`、`remediation` 和 `pedagogical_label` 的权威来源。

**C++ Core Guidelines (核心准则) [最高优先级]**

- **性质**: C++ 静态分析的“宪法”，由 Bjarne Stroustrup 和 Herb Sutter 维护。
- **价值**: 定义了“现代 C++”和“类型安全”。大部分 Warnings 应引用此处。
- _示例_: `ES.41` -> `CPP_ASSIGNMENT_IN_IF`。

**Effective Modern C++ (Scott Meyers) [必读]**

- **性质**: C++11/14/17/20 最佳实践指南。
- **价值**: 解释 `auto`, 智能指针, `std::move` 等新特性陷阱。用于新特性 Warnings 和性能提示。
- _示例_: `Item 20` -> `CPP_PASS_BY_VALUE`。

**Google C++ Style Guide (谷歌风格指南) [风格规范]**

- **性质**: 工业界最严格的代码风格规范。
- **价值**: 侧重可读性和可维护性。用于定义 Suggestions 类规则。
- _示例_: `CPP_VAR_NAMING`, `CPP_DEEP_NESTING`。

**SEI CERT C++ Coding Standard [安全红线]**

- **性质**: 专注于软件安全和防止 UB。
- **价值**: 提供导致漏洞的代码模式反面教材。用于 Errors 类规则。
- _示例_: `CPP_ARRAY_OOB_LITERAL`, `CPP_DIV_BY_ZERO`。

### 3. 技术对标：三大现有技术 (The Benchmarks)

用于寻找 SCM 规则灵感，并验证 AST 匹配逻辑的覆盖率。

**GitHub CodeQL [强烈推荐 - 架构同构]**

- **参考策略**: CodeQL 将代码视为数据并使用 QL 查询漏洞，与本项目使用 SCM 查询 AST 的逻辑**完全一致**。
- **应用**: 参考其开源 C++ 查询库，学习如何定义“数据流模式”，并尝试用 TypeScript Validators 模拟其逻辑。

**Clang-Tidy [行业标准]**

- **参考策略**: 直接“翻译”其模块为 `.scm` 文件。
- `modernize-*` -> Modern C++ Warnings
- `bugprone-*` -> Logic Errors
- `performance-*` -> Performance Hints

**SonarQube [代码质量]**

- **参考策略**: 参考其“认知复杂度”算法和“代码异味”分类。
- **应用**: 扩充关于代码结构混乱、废弃代码检测的规则。
