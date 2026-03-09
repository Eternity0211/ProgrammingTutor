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
动态分析规则（Dynamic Checkers）承担了静态正则（SCM）无法胜任的任务。与 SCM 相比，DFA 能够读取运行时推导的**区间信息**并在 AST 级别对变量做连续追踪，因此对以下场景具有显著优势：
- **跨语句状态传递**：当一个变量在多条语句中修改时（例如循环迭代/函数调用），静态正则只能在单条表达式内匹配，无法将前后赋值联系起来；动态规则则通过 `Environment` 账本跟踪区间，实现在整个控制流范围内的可靠推演。
- **循环与回边**：for/while 等结构导致值发生渐进性变化，可能出现发散区间。DFA 使用抽象解释对区间做闭包运算，能够识别出“可能越界”的边界变化，这在正则匹配下几乎不可能做到。
- **条件分支依赖**：某些缺陷只有在满足特定前置条件时才成立（如 if(a>b) a-b）。动态检查可以在分支处获取约束后再决定是否发出 Weak/Strong 警告。
- **算术溢出与异常值**：当加减乘除导致变量环绕或达到极限时，区间会拓展到⊤；动态规则能够在循环/分支中跟踪这种变化，并且在格式化/IO 调用中发现未初始化或污点字符串。
- **函数调用与类型转换**：参数传递时的未初始化、污点、越界或类型转换错误通常会在调用边界处被忽视；动态分析可在调用/返回时读取账本并发出相应警告。
- **赋值与返回边界**：赋值语句和函数返回都是状态变化的重要节点，污点、越界或非法值通过这些点传播。Checker 可以在赋值后立即检查以及在使用返回值时验证。
- **值域收缩/扩张**：通过算术运算、接口返回值等，变量的区间会动态变化。DFA 可计算算术结果区间并用于后续判断；静态正则只能硬编码模式，易遗漏。

### 正交缺陷矩阵
为了便于模式识别，行为列扩展至包括赋值、返回、调用和类型转换等常见触发点，而状态行则涵盖从未初始化到非法值的全谱。
下表将常见缺陷按数据状态和操作行为划分，同时标注最典型的控制流上下文。

| 状态 \ 行为       | 下标访问        | 指针解引用       | 算术运算（加减乘） | 算术运算（除 / 模） | 内存释放 / 删除   | 函数传参         | 显式类型转换     | 赋值操作         | 返回值使用       |
|--------------------|-----------------|------------------|---------------------|----------------------|--------------------|--------------------|------------------|------------------|------------------|
| 未初始化            | `use_before_init` | `uninit_deref`   | `uninit_arith`      | `uninit_arith`       | `uninit_free`      | `uninit_param`     | `uninit_cast`    | `uninit_assign`  | `uninit_return`  |
| 已释放（内存）      | `use_after_free`  | `dangling_ptr`   | ——                  | ——                   | `double_free`      | `use_after_free_param` | `use_after_free_cast` | `use_after_free_assign` | `use_after_free_return` |
| 空指针 / 空引用      | `null_index`      | `null_deref`     | ——                  | ——                   | ——                 | `null_param`       | `null_cast`      | `null_assign`    | `null_return`    |
| 污点数据            | `tainted_index`   | `tainted_deref`  | `tainted_arith_overflow` | `div_by_zero`        | `tainted_free`     | `tainted_param`    | `tainted_cast`   | `tainted_assign` | `tainted_return` |
| 区间发散            | `divergent_index` | `divergent_deref` | `divergent_arith`   | `divergent_div`      | ——                 | `divergent_param` | `divergent_cast` | `divergent_assign` | `divergent_return` |
| 下标越界            | `overflow_index`  | ——               | ——                  | ——                   | ——                 | ——                 | ——               | ——               | ——               |
| 数值溢出            | ——                | ——               | `arith_overflow`    | ——                   | ——                 | `overflow_param`   | `overflow_cast`  | `overflow_assign` | `overflow_return` |
| 语义非法值          | `invalid_index`   | `invalid_deref`  | `invalid_arith`     | `invalid_div`        | `invalid_free`     | `invalid_param`    | `invalid_cast`   | `invalid_assign` | `invalid_return` |

控制流维度反映了程序执行路径的复杂性，不同的路径会生成不同的区间信息，因此同一种“状态×行为”的缺陷在判定时可能呈现“确定”或“可能”的不同风险级别。换句话说，控制流上下文决定了分析器在计算区间时是否能精确逼近，从而影响最终 Must/May 分类。
- 线性顺序 (Sequential)：变量的值沿一条直线更新，没有分支或循环。包括简单赋值和返回后的直接使用，区间推导充满确定性，若结果越界或溢出则通常是 Must。
- 条件分支 (Branch)：同一个变量在 if/else 的不同分支中可能取不同值，分析器需对每条分支分别推导后**合并**为一个覆盖区间，这个合并往往产生部分合法、部分非法的情况，因此更倾向于 May。
- 循环回边 (Loop)：变量经由循环迭代其区间可能逐步扩张乃至发散为任意值，在没有足够收敛的情况下分析只能给出超集，导致警告由 Must 降为 May。
- 函数调用/返回 (Call/Return)：状态在函数边界上传递，返回值的污点或非法性可能在调用上下文中放大。动态规则会在调用与返回节点分别检查，确保跨函数传播不被忽略。

### 扩充蓝图（优先级）
1. **`div_by_zero.ts`**  
   - A: 污点发散 × B: 算术除法 × C: 循环/分支  
   - 高频出现于除法和模运算，特别是在循环累加/减的循环中。
2. **`null_deref.ts`**  
   - A: 空值 × B: 解引用 × C: 条件分支  
   - C++广泛存在指针检查后使用，漏写分支会造成运行时崩溃。
3. **`use_after_free.ts`**  
   - A: 已释放 × B: 解引用/访问 × C: 线性顺序与函数调用  
   - 内存错误是安全性首要问题，既可在单条语句也可跨函数检测。
4. **`uninitialized_var.ts`**  
   - A: 未初始化 × B: 解引用/读取 × C: 线性/循环  
   - 许多高级优化会导致寄存器变量未赋值就使用。
5. **`arith_overflow.ts`**  
   - A: 溢出/环绕 × B: 算术运算 × C: 循环/分支  
   - 带有常量和变量混合的加减乘除特别容易出现未检测的溢出。
6. **`buffer_overflow.ts`**  
   - A: 溢出/环绕 × B: 下标访问 × C: 污点/循环  
   - 数组下标由外部输入控制在循环中增长时极易超界。
7. **`format_string.ts`**  
   - A: 未初始化/污点 × B: 格式化/IO × C: 条件分支  
   - 用户可控字符串未经验证直接传给 printf 系列，产生泄露或崩溃。
8. **`param_taint.ts`**  
   - A: 污点/未初始化 × B: 函数调用传参 × C: 分支/循环  
   - 外部数据作为参数反复传递，函数体内未做校验时会导致级联错误。
9. **`cast_overflow.ts`**  
   - A: 越界/溢出 × B: 类型转换 × C: 算术运算  
   - 大小变化或有符号/无符号转换常在隐式赋值时发生，容易引入溢出。

### Must vs May 定性
> 抽象解释中的区间分析是关键：引擎对每个变量维护 `[min,max]` 或 `⊤`。
- **Must-Issue (Definite)**：当经过所有可能路径和迭代的求闭包后，变量区间与合法集合*完全不交叉*。例如 `x` 的区间为 `[1,∞)`，而欲进行 `x-2` 的下标访问，合法下标范围是 `[0,0]`，两者无交集 ⇒ Definite。
- **May-Issue (Suspected)**：若推导区间与合法集有交集但又不被包含。通常是在条件分支或循环中，区间由于控制流不同而“分裂”，分析结果给出一个包含所有可能值的上界区间。示例：`while(n-->0){a[n]=...}`，`n` 的区间 `[0,10]` 部分合法部分非法 ⇒ Suspected。

---

## 第三部分：理论依据

### 理论研究
本项目之动态分析体系根植于抽象解释（Abstract Interpretation）理论，该理论由Patrick Cousot与Radhia Cousot于1970年代后期奠基，旨在通过有序集上的单调函数实现程序语义的声学近似（Sound Approximation），从而克服停机问题与计算复杂性之障碍 [1]。

#### 抽象解释框架
抽象解释的核心在于建立具体语义（Concrete Semantics）与抽象语义（Abstract Semantics）间的对应关系。具体语义描述程序的实际执行行为，而抽象语义通过简化表示来近似这些行为。这种对应关系确保抽象分析的保守性，即如果抽象域中没有发现缺陷，那么实际执行中也不会有缺陷 [2]。

转移函数定义于抽象域上，为程序操作提供语义映射。固定点迭代处理循环与递归，通过数学定理保证最小不动点的存在。拓宽操作用于加速收敛，确保递增序列最终稳定 [3]。

#### 区间域
区间域为数值抽象域的典范，变量值表示为闭区间，引入无效值和任意值处理边界情况。区间运算支持基本算术操作。然而，这种非关系域的局限在于忽略变量间的关系，导致精度损失；关系域可以建模更复杂的约束，但计算复杂度更高 [4]。

#### 与控制流的结合
控制流图构建自抽象语法树，节点为基本块，边为转移。分支合并使用区间并集，实现可能分析；约束精化通过反向推导裁剪区间，提高必须分析精度。SSA形式便于数据流分析，消除变量重定义的歧义 [5]。

#### 理论基础与验证
Must/May分类基于安全域与警告域：前者保证无误报，后者标识潜在风险。关键文献包括Cousot夫妇的奠基论文，以及后续扩展如八边形域。验证通过形式证明与实验评估，确保理论的正确性与实用性 [6]。

#### 应用与挑战
抽象解释广泛应用于编译器优化、程序调试和安全验证。例如，在编译器中，它帮助决定是否应用特定优化；在调试中，它检测潜在错误如数组越界或除零。在工程实践中，挑战在于平衡分析精度与计算效率：过于精确的抽象可能导致不可计算，而过于粗糙的抽象会产生过多误报。最新进展包括结合机器学习提高抽象域的选择，以及在并发程序中的应用 [7]。

### 工程实践
项目于TypeScript/Node.js环境中实现上述理论，通过模块化架构与优化算法保障高效缺陷检测。

#### 分析引擎
引擎采用工作列表算法深度优先遍历CFG，确保全路径覆盖。状态管理维护块级入口状态与访问计数，触发拓宽机制防止循环发散。分支精化于条件节点根据真假分支裁剪环境，提高精度。不动点检测通过状态比较终止迭代，避免冗余计算。

##### 具体案例：循环处理
- **场景**：代码`for(int i=0; i<10; i++) arr[i]=0;`。
- **流程**：引擎遍历CFG，初始`i`区间`[0,0]`，循环中更新为`[0,∞)`触发拓宽，合并后区间稳定。
- **结果**：检测到潜在越界，报告Suspected。

#### 符号环境
环境追踪变量初始化状态、数值区间、指针与集合元数据。状态合并实现区间并集/交集，支持多路径汇聚。操作包括深拷贝与增量更新，确保分支独立性。

#### 检查器插件系统
系统提供统一Checker接口，接收AST节点与环境状态。注册中心通过ALL_CHECKERS数组集中管理，引擎遍历执行。实例如ArrayBoundsChecker拦截subscript_expression，计算下标区间与数组边界对比，区分Definite/Suspected。

##### 具体案例：数组越界检测
- **场景**：代码`int arr[10]; arr[i] = 0;`中，`i`区间为`[5, 15]`。
- **流程**：检查器提取数组名`arr`，查询环境得大小区间`[10, 10]`，计算下标区间，判断`15 > 9`为Suspected越界。
- **输出**：生成RawIssue，包含数组名、最大索引、下标区间等元数据。

#### 工具与案例
在工程实践中，抽象解释已被集成到多个工具中。例如，ASTREE分析器用于航空软件验证，成功避免了Ariane 5火箭事故类似的错误 [8]。Frama-C框架提供C程序的抽象解释插件，支持自定义抽象域。另一个例子是PolySpace工具，用于嵌入式系统中的静态分析。这些工具展示了抽象解释在工业级应用中的有效性，但也面临挑战如处理大规模代码库和提高用户友好性 [9]。

#### 优化与扩展
容错机制自动声明变量，支持多维/动态内存。性能优化通过拓宽阈值控制收敛，AST导航工具加速查找。可扩展性允许插件新增检查器，抽象域扩展至关系/符号域。质量保障遵循TDD，覆盖True Negative、Must-Issue、May-Issue。

理论与实践结合，实现高效动态分析系统，为C++安全提供保障。

### 参考文献
[1] Cousot, P., & Cousot, R. (1977). Abstract Interpretation: A Unified Lattice Model for Static Analysis of Programs by Construction or Approximation of Fixpoints. In Proceedings of the 4th ACM SIGACT-SIGPLAN Symposium on Principles of Programming Languages (POPL '77). ACM, pp. 238–252.

[2] Cousot, P., & Cousot, R. (1979). Systematic Design of Program Analysis Frameworks. In Proceedings of the 6th ACM SIGACT-SIGPLAN Symposium on Principles of Programming Languages (POPL '79). ACM, pp. 269–282.

[3] Cousot, P., & Cousot, R. (1992). Comparing the Galois Connection and Widening/Narrowing Approaches to Abstract Interpretation. In Programming Language Implementation and Logic Programming (PLILP '92). Springer, pp. 269–296.

[4] Cousot, P., & Cousot, R. (1976). Static Determination of Dynamic Properties of Programs. In Proceedings of the 2nd International Symposium on Programming. Dunod, pp. 106–130.

[5] Miné, A. (2006). The Octagon Abstract Domain. Higher-Order and Symbolic Computation, 19(1), 31–100.

[6] Granger, P. (1989). Static Analysis of Arithmetical Congruences. International Journal of Computer Mathematics, 30(3–4), 165–190.

[7] Yoon, Y., Lee, W., & Yi, K. (2023). Inductive Program Synthesis via Iterative Forward-Backward Abstract Interpretation. Proceedings of the ACM on Programming Languages, 7(PLDI), 174:1657–174:1681.

[8] Faure, C. (2010). PolySpace Technologies History. Retrieved from http://christele.faure.pagesperso-orange.fr/polyspace.html.

[9] Miné, A. (2012). Abstract Domains for Bit-Level Machine Integer and Floating-Point Operations. In International Workshop on Invariant Generation (WING '12).
---