# 依赖安全基线

## 当前状态

2026-09-28 使用 `npm audit` 复核生产与开发依赖，漏洞数由 47 个（6 Critical、10 High、25 Moderate、6 Low）降为 0。修复过程没有使用 `npm audit fix --force`。

主要处理包括：

- 将 Next.js 从 `15.5.6` 更新到同一兼容线的 `15.5.26`，同时对齐 `eslint-config-next`；
- 将 `next-auth` 更新到 `5.0.0-beta.32`、Prisma Adapter 更新到 `2.11.3`，消除旧 Auth.js Core 漏洞链；
- 将 PostCSS 固定到 `8.5.28`，并用 npm override 确保 Next.js 不再加载其历史内置版本；
- 将 Sharp 固定覆盖为 `0.35.4`，消除图片处理原生库的已知漏洞；
- 删除源码未使用的 `ai`、`@ai-sdk/groq` 与直接 `@auth/core` 依赖，减少 17 个不必要的软件包和对应攻击面。

## 持续门禁

GitHub `Quality` workflow 在 `npm ci` 后执行 `npm audit --audit-level=high`。新的 High 或 Critical 漏洞会阻止准出；Low/Moderate 仍会出现在定期审计中，按兼容性安排升级。

依赖更新后必须执行：

```powershell
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

禁止为了清零报告直接使用 `npm audit fix --force`。需要大版本升级时，应单独建立迁移任务并验证 API、构建产物和关键业务路径。
