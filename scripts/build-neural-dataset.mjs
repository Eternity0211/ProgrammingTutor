import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const outputDir = path.resolve("data/neural");
const revision = "2026.09.30.1";
const instruction =
  "你是一位专业的编程教育导师。请根据学生代码和符号诊断生成反馈，包含错误性质、因果解释和不直接给出完整答案的启发式建议。";

const cases = [
  [
    "ArrayOutOfBounds",
    "cpp.memory.array_bounds",
    "beginner",
    "数组越界",
    "循环边界允许索引到达数组长度，而最后一个合法索引应比长度小 1。",
    "重新检查循环终止条件与合法索引范围。",
    [
      "void f(int*a,int n){for(int i=0;i<=n;i++) a[i]=0;}",
      "int f(int*a,int n){int s=0;for(int i=1;i<=n;i++)s+=a[i];return s;}",
      "char f(char*s,int n){return s[n];}",
    ],
  ],
  [
    "MemoryLeak",
    "cpp.memory.leak",
    "intermediate",
    "内存泄漏",
    "动态分配的资源在所有退出路径上都没有明确的所有者和释放动作。",
    "标出资源所有权和生命周期，优先使用 RAII 容器。",
    [
      "void f(){int*p=new int[8];p[0]=1;}",
      "int f(){auto*p=new int(3);return *p;}",
      "void f(bool x){char*p=new char[32];if(x)return;delete[]p;}",
    ],
  ],
  [
    "InfiniteRecursion",
    "cpp.control.recursion",
    "beginner",
    "无穷递归",
    "递归调用没有可达的基础分支，参数也无法使调用收敛。",
    "先定义最小问题的返回值，再确认每次调用都更接近它。",
    [
      "int f(int n){return n*f(n-1);}",
      "int f(int n){if(n<0)return 0;return f(n+1);}",
      "void f(){f();}",
    ],
  ],
  [
    "LogicError",
    "cpp.logic.operator_precedence",
    "beginner",
    "逻辑错误",
    "运算符优先级使表达式的实际求值顺序与需求不同。",
    "用括号明确计算步骤，并用简单输入手算对照。",
    [
      "int avg(int a,int b){return a+b/2;}",
      "bool in(int x){return x>0&&x<10||x==20;}",
      "int area(int w,int h){return w<<h+1;}",
    ],
  ],
  [
    "NullDereference",
    "cpp.memory.null_dereference",
    "beginner",
    "空指针解引用",
    "指针可能为空，但在访问其指向对象前没有建立非空条件。",
    "列出指针的所有来源，并在解引用前验证前置条件。",
    [
      "int f(int*p){return *p;}",
      "int f(bool ok){int*p=ok?new int(1):nullptr;return *p;}",
      "void f(int*p){p[0]=7;}",
    ],
  ],
  [
    "DivisionByZero",
    "cpp.arithmetic.division_by_zero",
    "beginner",
    "除零风险",
    "除数来自未约束输入或计算结果，存在取零的执行路径。",
    "在除法前写出除数的取值范围并处理零值。",
    [
      "int f(int a,int b){return a/b;}",
      "int f(int n){return 100/(n-1);}",
      "int f(int a,int b){return a%(b-b);}",
    ],
  ],
  [
    "UseAfterFree",
    "cpp.memory.use_after_free",
    "advanced",
    "释放后使用",
    "对象生命周期已经结束，但别名仍被读取或写入。",
    "在释放点追踪所有别名，并让悬空指针失效。",
    [
      "int f(){int*p=new int(4);delete p;return *p;}",
      "void f(int*p){delete p;p[0]=2;}",
      "int f(){int*p=new int[2];delete[]p;return p[1];}",
    ],
  ],
  [
    "DoubleFree",
    "cpp.memory.double_free",
    "advanced",
    "重复释放",
    "同一资源所有权被多个路径重复结束，第二次释放触发未定义行为。",
    "确保资源只有一个所有者，释放后清空或转移所有权。",
    [
      "void f(){int*p=new int;delete p;delete p;}",
      "void f(int*p,bool x){delete p;if(x)delete p;}",
      "void f(){char*p=new char[4];delete[]p;delete[]p;}",
    ],
  ],
  [
    "UninitializedVariable",
    "cpp.memory.uninitialized",
    "intermediate",
    "未初始化变量",
    "局部变量在赋值前参与计算，结果取决于不确定的栈内容。",
    "检查每条控制流路径是否都在读取前完成初始化。",
    [
      "int f(){int x;return x+1;}",
      "int f(bool b){int x;if(b)x=2;return x;}",
      "int f(){int a[2];a[0]=1;return a[1];}",
    ],
  ],
  [
    "IntegerOverflow",
    "cpp.arithmetic.overflow",
    "intermediate",
    "整数溢出",
    "运算结果可能超过目标整数类型的表示范围。",
    "估算最大中间值，并选择足够宽的类型或显式检查。",
    [
      "int f(int a,int b){return a*b;}",
      "int f(int n){return n*(n+1)/2;}",
      "int f(int x){return x+2147483647;}",
    ],
  ],
  [
    "FormatString",
    "cpp.io.format_string",
    "advanced",
    "格式字符串风险",
    "外部输入被当作格式模板解释，可能读取或写入非预期内存。",
    "让格式模板保持常量，并把外部文本作为普通参数输出。",
    [
      "void f(char*s){printf(s);}",
      "void f(std::string s){printf(s.c_str());}",
      "void f(char*msg){fprintf(stderr,msg);}",
    ],
  ],
  [
    "MissingReturn",
    "cpp.control.missing_return",
    "intermediate",
    "缺少返回值",
    "非 void 函数存在到达末尾而没有返回值的控制流路径。",
    "逐条检查分支，确保每个可达出口都返回约定类型。",
    [
      "int f(bool b){if(b)return 1;}",
      "int f(int x){switch(x){case 0:return 0;}}",
      "int f(int x){if(x<0)return -1;else if(x>0)return 1;}",
    ],
  ],
];

const splitNames = ["train", "val", "test"];
const rows = Object.fromEntries(splitNames.map((split) => [split, []]));

for (const [
  category,
  conceptId,
  difficulty,
  diagnosis,
  cause,
  hint,
  variants,
] of cases) {
  variants.forEach((code, index) => {
    const split = splitNames[index];
    rows[split].push({
      id: `${split}-${category.toLowerCase()}-${index + 1}`,
      language: "cpp",
      error_type: category,
      difficulty,
      concept_id: conceptId,
      source: "curated-symbolic-regression",
      instruction,
      input: `【学生代码】：\n${code}\n\n【符号诊断结论】：\n[Category: ${category}, Variant: ${index + 1}]`,
      output: `### 1. 错误诊断\n检测到**${diagnosis}**。\n\n### 2. 因果解释\n${cause}\n\n### 3. 启发式建议\n${hint}`,
    });
  });
}

fs.mkdirSync(outputDir, { recursive: true });
for (const split of splitNames) {
  fs.writeFileSync(
    path.join(outputDir, `${split}.jsonl`),
    `${rows[split].map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
}

const errorTypes = cases.map(([category]) => category);
const conceptIds = Object.fromEntries(
  cases.map(([category, id]) => [category, id]),
);
const metadata = {
  project_name: "ProgrammingTutor",
  dataset_version: "2.0.0",
  dataset_revision: revision,
  last_updated: "2026-09-30",
  source: "curated symbolic-analysis regression cases",
  generation_command: "npm run build:dataset",
  languages: ["cpp"],
  error_types: errorTypes,
  difficulty_levels: ["beginner", "intermediate", "advanced"],
  knowledge_concept_ids: conceptIds,
  statistics: {
    total_samples: splitNames.reduce(
      (sum, split) => sum + rows[split].length,
      0,
    ),
    split_distribution: Object.fromEntries(
      splitNames.map((split) => [split, rows[split].length]),
    ),
    error_categories: Object.fromEntries(
      errorTypes.map((category) => [category, 3]),
    ),
  },
  data_schema: {
    id: "Stable sample identifier",
    language: "Source language",
    error_type: "Expected diagnostic category",
    difficulty: "beginner, intermediate, or advanced",
    concept_id: "Shared knowledge concept identifier",
    source: "Data provenance",
    instruction: "Prompt template for code review",
    input: "Student code and symbolic diagnostic",
    output: "Causal teaching feedback",
  },
};
const formattedMetadata = await prettier.format(JSON.stringify(metadata), {
  parser: "json",
});
fs.writeFileSync(path.join(outputDir, "metadata.json"), formattedMetadata);
console.log(
  `[dataset] generated ${metadata.statistics.total_samples} rows at revision ${revision}`,
);
