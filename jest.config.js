const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // 指向你的 Next.js 应用目录
  dir: "./",
});

const customJestConfig = {
  // 确保测试环境是 node (因为我们需要 fs 读取 .wasm)
  testEnvironment: "node",

  moduleNameMapper: {
    // 处理 TS 路径别名
    "^@/(.*)$": "<rootDir>/$1",
  },

  // 忽略构建目录
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

module.exports = createJestConfig(customJestConfig);
