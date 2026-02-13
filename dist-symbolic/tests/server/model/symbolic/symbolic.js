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
    const sourceCode = `
    #include <stdio.h>

    int main() {  
      int a[10] = {0};
      a[-1] = 5; // 负数索引越界

      return 0;
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
    }
    catch (error) {
        console.error("❌ Debug execution failed:");
        console.error(error);
    }
    console.log("\n=======================================");
    console.log("Debug Session End");
    console.log("=======================================");
}
main();
