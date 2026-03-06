"use client";
import { useState, useEffect, use } from "react";
import DiagnosticEditor from "@/app/_components/code-editor/diagnostic-editor";
import DiagnosticPanel from "@/app/_components/submission/diagnostic-panel";
// 导入项目官方类型（关键！）
import type { 
  SymbolicIssue, 
  SymbolicSeverity,
  SymbolicResult,
  SourceLocation
} from "@/lib/types/symbolic-types";

// 动态路由参数类型
type PageParams = { id: string };

export default function SubmissionResultPage({ params }: { params: Promise<PageParams> }) {
  // 解包 Next.js 15+ 异步 params
  const { id } = use<PageParams>(params);

  // 状态定义（完全匹配项目类型）
  const [data, setData] = useState<{
    code: string;
    symbolicResult: SymbolicResult; // 使用项目定义的 SymbolicResult
    causalFeedback: string;
  } | null>(null);
  
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [currentConcept, setCurrentConcept] = useState<string>("");

  // 加载 Mock 测试数据（严格匹配项目类型规范）
  useEffect(() => {
    // 测试用 C++ 代码（包含2个典型错误）
    const testCode = `#include <iostream>
using namespace std;

int main() {
  int count = 0; // 局部变量定义
  count++;
  return 0;
}

// 全局调用局部变量（Critical 级错误）
for (int i = 0; i < count; i++) {
  cout << i << endl;
}

// switch 缺少 default（Medium 级警告）
switch (input) {
  case 1: cout << "选择1"; break;
  case 2: cout << "选择2"; break;
}`;

    // 错误1：变量作用域问题（Critical 级别）
    const scopeError: SymbolicIssue = {
      ruleId: "CPP_GLOBAL_VARIABLE", // 使用项目定义的规则ID
      severity: "Critical" as SymbolicSeverity, // 匹配 SymbolicSeverity 类型
      display_name: "变量作用域未定义",
      message: "变量count在main函数局部作用域定义，却在全局代码块中调用，违反C++作用域规则",
      pedagogical_label: "Memory Safety", // 教学标签（按项目规范）
      knowledge_concept: "cpp_variable_scope", // 知识图谱Key
      location: { line: 10, column: 10 } as SourceLocation, // 位置信息
      description: "C++中局部变量仅能在其定义的作用域内被访问，全局代码块无法访问函数内的局部变量",
      remediation: "将变量count定义移至main函数外部，或把循环逻辑移入main函数内部",
      remediation_code: `#include <iostream>
using namespace std;

int count = 0; // 全局变量定义

int main() {
  count++;
  for (int i = 0; i < count; i++) {
    cout << i << endl;
  }
  return 0;
}`
    };

    // 错误2：switch 缺少 default（Medium 级别）
    const switchError: SymbolicIssue = {
      ruleId: "CPP_SWITCH_NO_DEFAULT", // 使用项目定义的规则ID
      severity: "Medium" as SymbolicSeverity, // 匹配 SymbolicSeverity 类型
      display_name: "switch语句缺少default分支",
      message: "switch语句仅处理case 1和case 2，未处理其他输入值，存在逻辑漏洞",
      pedagogical_label: "Control Flow", // 教学标签
      knowledge_concept: "cpp_switch_statement", // 知识图谱Key
      location: { line: 15, column: 2 } as SourceLocation, // 位置信息
      description: "switch语句应包含default分支以处理所有未匹配的输入，避免程序行为不可预期",
      remediation: "添加default分支，处理无效输入场景",
      remediation_code: `switch (input) {
  case 1: cout << "选择1"; break;
  case 2: cout << "选择2"; break;
  default: cout << "无效输入" << endl; break;
}`
    };

    // 完整的 SymbolicResult（匹配项目类型）
    const testSymbolicResult: SymbolicResult = {
      errors: [scopeError, switchError], // 阻断性错误
      warnings: [], // 建议性警告（暂无）
      metadata: {
        parseTime: 120,
        nodeCount: 45,
        analyzedAt: new Date().toISOString()
      }
    };

    console.log("设置的 testSymbolicResult:", testSymbolicResult);

    // 设置 Mock 数据
    setData({
      code: testCode,
      symbolicResult: testSymbolicResult,
      causalFeedback: `### 神经符号融合分析结果
1. **变量作用域错误**：
   - 根因：局部变量count被全局代码块访问，违反C++作用域规则
   - 逻辑推导：AST分析显示变量声明节点位于main函数内部，调用节点位于全局代码块
   - 修复建议：将变量提升为全局变量，或调整代码结构

2. **switch语句不完整**：
   - 根因：缺少default分支，无法处理非1/2的输入值
   - 逻辑推导：符号规则检测到switch节点缺少default子节点
   - 修复建议：添加default分支处理边界情况`
    });
  }, [id]);

  // 知识溯源弹窗触发逻辑
  const handleTraceKnowledge = (concept: string) => {
    setCurrentConcept(concept);
    setShowKnowledgeModal(true);
    console.log("知识溯源 - 关联知识点：", concept);
  };

  // 加载中状态
  if (!data) return (
    <div className="container mx-auto py-6 flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">加载神经符号诊断中...</p>
      </div>
    </div>
  );

  // 空状态（无错误时）
  if (data.symbolicResult.errors.length === 0 && data.symbolicResult.warnings.length === 0) return (
    <div className="container mx-auto py-6 flex flex-col items-center justify-center h-screen">
      <div className="text-center">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h2 className="text-xl font-bold text-gray-800 mb-2">神经符号引擎检测通过</h2>
        <p className="text-gray-600">未发现C++语法/逻辑错误，代码符合C++17标准</p>
      </div>
    </div>
  );

  // 主页面渲染
  return (
    <div className="container mx-auto py-6 flex flex-col h-screen">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">代码诊断详情 - 神经符号融合模式</h1>
        <span className="text-sm text-gray-500">提交ID：{id}</span>
      </div>

      {/* 核心内容区 */}
      <div className="grid grid-cols-12 gap-6 flex-grow overflow-hidden">
        {/* 左侧：代码编辑区（带错误高亮） */}
        <div className="col-span-7 rounded-xl border overflow-hidden bg-white shadow-sm">
          <DiagnosticEditor 
            code={data.code} 
            issues={[...data.symbolicResult.errors, ...data.symbolicResult.warnings]} // 合并错误和警告
            selectedIssueId={selectedIssueId}
          />
        </div>

        {/* 右侧：诊断面板 */}
        <div className="col-span-5 flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
          <DiagnosticPanel 
            issues={[...data.symbolicResult.errors, ...data.symbolicResult.warnings]} // 合并错误和警告
            aiFeedback={data.causalFeedback}
            onSelectIssue={setSelectedIssueId}
            onTraceKnowledge={handleTraceKnowledge}
          />
        </div>
      </div>

      {/* 知识溯源弹窗（Mock版） */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">知识溯源 - {currentConcept}</h3>
                <button 
                  onClick={() => setShowKnowledgeModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* 知识点内容（按项目规范） */}
              {currentConcept === "cpp_variable_scope" && (
                <div className="space-y-4">
                  <h4 className="font-semibold">知识点说明</h4>
                  <p className="text-gray-700 text-sm">
                    C++中变量的作用域分为：全局作用域（整个程序）、局部作用域（函数/代码块内）、类作用域等。
                    局部变量仅能在其定义的作用域内被访问，超出作用域后变量会被销毁。
                  </p>
                  <h4 className="font-semibold mt-4">前置依赖知识点</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    <li>C++命名空间（namespace）</li>
                    <li>变量声明与定义规则</li>
                    <li>栈内存与堆内存管理</li>
                  </ul>
                  <h4 className="font-semibold mt-4">常见错误场景</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    <li>全局代码访问函数内局部变量</li>
                    <li>嵌套代码块中变量重定义</li>
                    <li>函数返回局部变量的指针</li>
                  </ul>
                </div>
              )}
              
              {currentConcept === "cpp_switch_statement" && (
                <div className="space-y-4">
                  <h4 className="font-semibold">知识点说明</h4>
                  <p className="text-gray-700 text-sm">
                    switch语句用于多分支条件判断，由case分支和可选的default分支组成。
                    default分支用于处理所有未匹配的case，是保证代码鲁棒性的重要手段。
                  </p>
                  <h4 className="font-semibold mt-4">前置依赖知识点</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    <li>条件判断语句（if/else）</li>
                    <li>C++基本语法结构</li>
                    <li>枚举类型与switch的配合使用</li>
                  </ul>
                  <h4 className="font-semibold mt-4">最佳实践</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    <li>始终添加default分支</li>
                    <li>每个case分支末尾添加break</li>
                    <li>避免switch嵌套过深</li>
                  </ul>
                </div>
              )}
              
              <button 
                onClick={() => setShowKnowledgeModal(false)}
                className="mt-6 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}