"use strict";
/**
 * @file symbolic.ts
 * @description Symbolic Analysis Engine 本地调试脚本
 *
 * 使用方式：
 * 先编译：npx tsc -p tsconfig.symbolic.json
 * 再运行：node dist-symbolic/tests/server/model/symbolic/symbolic.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../../src/server/model/symbolic/service");
async function main() {
  // ============================================================
  // ✏️ 在这里直接修改测试代码
  // ============================================================
  // 示例代码：一次性触发多种规则，便于人工观察：
  // - CPP_NEGATIVE_INDEX_ACCESS         : a[-1]
  // - CPP_RESERVED_IDENTIFIER           : int _X, int __system
  // - CPP_VAR_NAMING (warning, style)   : int a = 0;
  // - CPP_DIVISION_BY_ZERO_LITERAL      : x / 0
  // - CPP_MISSING_BREAK                 : switch case 缺少 break
  // - CPP_NON_VOID_NO_RETURN            : 非 void 函数无 return
  // - CPP_SWITCH_NO_DEFAULT (warning)   : switch 缺少 default
  const sourceCode = `
    #include <stdio.h>

    int _X = 0;         // CPP_RESERVED_IDENTIFIER
    int __system = 1;   // CPP_RESERVED_IDENTIFIER

    int div_zero(int x) {
      int a = x / 0;    // CPP_DIVISION_BY_ZERO_LITERAL
      return a;
    }

    int main() {
      int a[10] = {0};
      a[-1] = 5;        // CPP_NEGATIVE_INDEX_ACCESS

      int a = 0;        // CPP_VAR_NAMING (短变量名)

      return 0;
    }

    int switch_missing_break(int x) {
      switch (x) {
        case 1:
          x++;
        case 2:
          break;
      }
      return x;         // CPP_MISSING_BREAK
    }

    int switch_no_default(int x) {
      switch (x) {      // CPP_SWITCH_NO_DEFAULT (warning)
        case 1:
          return 1;
        case 2:
          return 2;
      }
    }

    int non_void_no_return(int x) { // CPP_NON_VOID_NO_RETURN
      if (x > 0) {
        x++;
      }
      // 无显式返回语句
    }
  `;
  console.log("=======================================");
  console.log("Symbolic Analysis Debug Session Start");
  console.log("=======================================\n");
  console.log("📥 Input Source Code:\n");
  console.log(sourceCode);
  console.log("\n---------------------------------------\n");
  try {
    console.log("Before analyzeCode");
    const result = await (0, service_1.analyzeCode)(sourceCode);
    console.log("After analyzeCode");
    console.log("📤 Analysis Result:\n");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n---------------------------------------\n");
    console.log("📊 Summary:");
    console.log(`Errors   : ${result.errors.length}`);
    console.log(`Warnings : ${result.warnings.length}`);
    if (result.metadata) {
      console.log(`Parse Time (ms): ${result.metadata.parseTime?.toFixed(2)}`);
      console.log(`AST Node Count : ${result.metadata.nodeCount}`);
    }
  } catch (error) {
    console.error("❌ Debug execution failed:");
    console.error(error);
  }
  console.log("\n=======================================");
  console.log("Debug Session End");
  console.log("=======================================");
}
main();
