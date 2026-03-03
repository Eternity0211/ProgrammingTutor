# C++ 动态符号分析规则扩增指南

与静态正则匹配（SCM）不同，动态规则（Checkers）通过拦截 AST 节点，向引擎的“运行时账本（Environment）”索要变量的数学区间（Interval），进行实时的安全界限推演。

本引擎采用严格的**数据驱动**与**插件化架构**。开发新规则时，请**务必遵循**以下 TDD（测试驱动开发）四步流。

---

## 第一部分：技术指南 - 标准开发工作流 (The TDD Pipeline)

### Step 1: 编写富文本定义 (JSON)

常规的字段配置与静态规则一致，此处仅强调**动态规则独有特性**：

* **命名规范**: Rule ID 请统一以 `CPP_DYNAMIC_` 开头。
* **插值变量**: `message` 字段不仅支持节点名，还可以预留动态插值槽位（如 `{interval}`, `{varName}`, `{maxSize}`）。这些数据将由你的 Checker 在运行时计算并注入。

### Step 2: 编写测试用例

**【核心要求】：在写业务代码前，先写测试定好边界**
在 `tests/server/model/symbolic/dynamic/checkers/规则名.test.ts` 中，必须覆盖以下三大数学维度：

1. **[True Negative] 防误报测试**: 构造极其贴近危险边缘但**合法**的代码，确保引擎不产生扰民报警。
2. **[Must-Issue] 必然缺陷 (Error)**: 构造静态可确定的越界/除零/空指针，断言引擎抛出 `DEFINITE` 规则。
3. **[May-Issue] 潜在风险 (Warning)**: 构造受 `while` 循环或污点变量控制的**发散代码**，断言引擎精准抛出 `SUSPECTED` 规则。

### Step 3: 编写检查器逻辑 (Checker Script)

在 `src/server/model/symbolic/dynamic/checkers/规则名.ts` 中，导出一个实现 `Checker` 接口的对象。
代码骨架只需四步：

1. **拦截**: 判断 `node.type`，尽早 `return null` 过滤掉不关心的节点。
2. **查账**: 使用 `env.getInterval("变量名")` 或 `env.get("变量名")` 获取引擎当前推导出的状态数据。
3. **判决**:
* 若推导出的状态**完全**非法 -> 判定为 Must-Issue。
* 若推导出的状态**部分**非法（有合法的可能） -> 判定为 May-Issue。


4. **发射**: 返回组装好的 `RawIssue`。务必在 `meta` 属性中填入 Step 1 预留的插值数据。

### Step 4: 注册并激活规则 (Register)

检查器写好后处于沉睡状态，必须进行挂载：

1. 打开 `src/server/model/symbolic/dynamic/checkers/index.ts`。
2. `import` 你的 Checker。
3. 将其追加到 `ALL_CHECKERS` 数组中即可全图生效。

---

## 架构红线 (Architecture Red Line)

**绝不允许修改引擎底层（`engine.ts`, `state.ts`, `cfg.ts`）。**
出于封装考虑，请勿修改除上述4类文件以外的文件。
现有文件已尽可能高粒度解析CFG，若有额外需要，请将需求告知我（张语桐），我来进行更新。

---

## 第二部分：思路指南

> **TODO：请在此处利用“正交分析法”完善动态分析规则的扩充思路**
> 
> **任务指引 (请在撰写完成后删除此框)：**
> 1. **明确 DFA 的核心优势**：请解释为什么我们要写动态规则（Checkers）而不是静态正则（SCM）。指出 DFA 在处理跨语句推演、循环发散等场景下的不可替代性。
> 2. **建立“正交缺陷矩阵”**：请利用正交维度划分缺陷领域，指导后续的开发。建议从以下三个正交维度进行组合枚举：
>    - **维度 A：数据/内存状态 (State)**：如 未初始化 (Uninitialized)、已释放 (Freed)、空值 (Null)、污点发散 (Tainted/Top)。
>    - **维度 B：操作行为 (Behavior)**：如 下标访问 (Subscript)、解引用 (Dereference)、算术除法 (Division)、内存释放 (Free)。
>    - **维度 C：控制流上下文 (Context)**：如 线性顺序 (Sequential)、条件分支 (Branch)、循环回边 (Loop/Back-edge)。
> 3. **绘制扩充蓝图**：请挑选上述维度中最高频的交叉点，列出接下来要优先开发的 3-4 个 Checkers。
>    - *示例：[A: 污点发散] × [B: 算术除法] = `div_by_zero.ts` (除零错误)*
>    - *示例：[A: 未初始化] × [B: 解引用/读取] = `uninitialized_var.ts` (未初始化使用)*
> 4. **界定 Must vs May 的定性标准**：结合抽象解释理论，用通俗语言明确界定：
>    - **Must-Issue (Definite)**：推演出的极值区间与合法状态完全无交集。
>    - **May-Issue (Suspected)**：因控制流（维度 C）导致区间发生部分合法、部分非法的发散。

（请在此处开始撰写你的内容。建议使用 Markdown 表格画出一个“状态 × 行为”的正交矩阵图）

---

## 第三部分：理论依据

> TODO：请在此处补充我们制定和编写动态规则的权威理论支撑体系