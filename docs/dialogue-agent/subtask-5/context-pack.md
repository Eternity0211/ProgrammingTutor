# Subtask 5 — Context Pack

## 交付物

- `prisma/schema.prisma` — 新增 StudentProfile 模型 + User.studentProfile 关联
- `src/server/model/dialogue/profile/profile-store.ts` — ProfileStore 接口 + InMemoryProfileStore
- `src/server/model/dialogue/profile/db-profile-store.ts` — DbProfileStore（Prisma，容错降级）
- `src/server/model/dialogue/profile/dual-profile-store.ts` — DualProfileStore（memory-first + DB 双写）
- `src/server/model/dialogue/profile/profile-updater.ts` — ProfileUpdater
- `src/server/model/dialogue/profile/index.ts` — 统一 re-export
- `tests/server/model/dialogue/profile-store.test.ts` — 9 测试
- `tests/server/model/dialogue/profile-updater.test.ts` — 14 测试

## 关键设计决策

1. **ProfileStore 接口**：getProfile / createProfile / updateProfile / upsertProfile，与 SessionStore 模式一致
2. **InMemoryProfileStore.getProfile 返回深拷贝**：防止外部修改影响存储数据
3. **setProfile 方法**：供 DualProfileStore 缓存 DB 数据时使用，创建深拷贝
4. **DbProfileStore 容错降级**：Prisma 异常 → console.warn + 返回 null / throw（由 DualProfileStore 捕获）
5. **DualProfileStore**：memory-first 读 → DB 回填 → 缓存；双写 DB 失败仅 warn
6. **ProfileUpdater.updateFromAgentResults**：
   - codeReview + questionId → 关键词匹配 31 个编程概念，新增 CodeSubmissionRecord
   - score 优先用 context.score，否则用 confidence*100
   - emotion → 查找/新建 EmotionStat，count++，更新 lastIntensity/lastTimestamp
   - navigation.weaknesses → 合并去重 weakKnowledgePoints
   - store 失败 → catch → 返回空默认画像，不抛异常
7. **summarizeForContext**：模板拼接，分段缺失时省略对应部分，全空返回"暂无学生画像数据"

## 验证结果

- `npx prisma generate`：成功
- `npx tsc --noEmit`：零错误
- `npx jest --testPathPatterns=dialogue --runInBand`：118/118 通过（10 套件，含 Subtask 1-4 的 96 测试 + Subtask 5 的 22 测试）
- 原有 3 个 Agent 零改动
- 未修改 .env
- 未引入新 npm 依赖

## 注意事项

- 用户需手动执行 `npx prisma migrate dev --name add_student_profile` 生成迁移
- Prisma schema 新增 StudentProfile 模型（@@map("student_profiles")）

## 后续子任务依赖关系

- Subtask 6（编排器）：Agent 执行后调用 `profileUpdater.updateFromAgentResults(userId, agentResults, context)` 积累画像；对话前调用 `store.getProfile(userId)` → `profileUpdater.summarizeForContext(profile)` 注入 LLM 上下文
